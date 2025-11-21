# GitHub Actions OIDC Setup for AWS ECS Deployment

This guide explains how to set up secure AWS authentication for GitHub Actions using OpenID Connect (OIDC) instead of long-lived AWS access keys.

## Overview

The deployment workflow (`.github/workflows/deploy-to-ecs.yml`) uses GitHub Actions OIDC to authenticate with AWS. This approach is more secure than storing long-lived AWS credentials in GitHub Secrets because:

- No long-lived credentials to manage or rotate
- Temporary credentials are automatically generated per workflow run
- Fine-grained access control through IAM trust policies
- Reduced risk of credential leakage

## Prerequisites

- AWS account with permissions to create IAM roles and policies
- GitHub repository admin access to manage secrets
- Existing or planned ECS infrastructure (cluster, service, ECR repository)

## Setup Steps

### Step 1: Create GitHub OIDC Provider in AWS (One-time setup per AWS account)

If you haven't already set up the GitHub OIDC provider in your AWS account, you need to create it first:

1. Go to the AWS IAM Console → Identity providers → Add provider
2. Configure the provider:
   - **Provider type**: OpenID Connect
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`
3. Click "Add provider"

Alternatively, use AWS CLI:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

**Note**: The thumbprint is automatically obtained by AWS. If you need to manually specify it, you can get the current thumbprint using:
```bash
openssl s_client -servername token.actions.githubusercontent.com -showcerts -connect token.actions.githubusercontent.com:443 < /dev/null 2>/dev/null | openssl x509 -fingerprint -noout -sha1 | sed 's/://g' | sed 's/SHA1 Fingerprint=//'
```

### Step 2: Create IAM Role Trust Policy

Create a file named `github-actions-trust-policy.json` with the following content. **Replace the placeholders** with your values:

- `ACCOUNT_ID`: Your AWS account ID (12-digit number)
- Optionally adjust the `sub` condition to restrict access to specific branches

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:RYA234/typescript-container:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

**Trust Policy Options:**

- To allow **only the main branch**: `"token.actions.githubusercontent.com:sub": "repo:RYA234/typescript-container:ref:refs/heads/main"`
- To allow **all branches**: `"token.actions.githubusercontent.com:sub": "repo:RYA234/typescript-container:*"`
- To allow **specific branches**: Use multiple conditions or a `StringLike` condition with wildcards

### Step 3: Create IAM Permissions Policy

Create a file named `github-actions-permissions-policy.json` with the following content. **Replace the placeholders**:

- `ACCOUNT_ID`: Your AWS account ID
- Adjust resource ARNs to match your infrastructure

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRPermissions",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSPermissions",
      "Effect": "Allow",
      "Action": [
        "ecs:RegisterTaskDefinition",
        "ecs:DescribeTaskDefinition",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
      ]
    }
  ]
}
```

**Security Note**: For production environments, further restrict the `Resource` fields:

- ECR: `"Resource": "arn:aws:ecr:ap-northeast-1:ACCOUNT_ID:repository/typescript-container"`
- ECS: `"Resource": "arn:aws:ecs:ap-northeast-1:ACCOUNT_ID:service/typescript-container-cluster/typescript-container-service"`

**Important**: The ECR repository must be created manually before first deployment. The policy intentionally does not include `ecr:CreateRepository` to prevent unauthorized repository creation.

### Step 4: Create the IAM Role

Using AWS CLI:

```bash
# Create the role with the trust policy
aws iam create-role \
  --role-name GitHubActionsRole \
  --assume-role-policy-document file://github-actions-trust-policy.json \
  --description "Role for GitHub Actions to deploy to ECS"

# Attach the permissions policy inline
aws iam put-role-policy \
  --role-name GitHubActionsRole \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://github-actions-permissions-policy.json
```

Or using the AWS Console:

1. Go to IAM → Roles → Create role
2. Select "Web identity" as the trusted entity type
3. Choose the GitHub OIDC provider and audience `sts.amazonaws.com`
4. Add the trust policy JSON from Step 2
5. Create and attach a custom inline policy using the JSON from Step 3
6. Name the role `GitHubActionsRole`

### Step 5: Update Task Definition

Edit `.aws/task-definition.json` and replace `ACCOUNT_ID` with your AWS account ID in:

- `executionRoleArn`
- `taskRoleArn`
- `image` URL

Example:

```json
{
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "image": "123456789012.dkr.ecr.ap-northeast-1.amazonaws.com/typescript-container:IMAGE_TAG",
      ...
    }
  ]
}
```

**Note**: The `IMAGE_TAG` placeholder will be replaced dynamically by the GitHub Actions workflow with the actual commit SHA.

### Step 6: Create GitHub Repository Secret

Add the AWS account ID as a repository secret:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `AWS_ACCOUNT_ID`
4. Value: Your 12-digit AWS account ID (e.g., `123456789012`)
5. Click "Add secret"

**Alternative**: Instead of using a secret, you can hard-code the role ARN directly in the workflow:

```yaml
- name: Configure AWS credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: ${{ env.AWS_REGION }}
```

### Step 7: Clean Up Old Credentials (Optional)

If you previously used long-lived AWS credentials, you can now remove them:

1. Delete `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from GitHub repository secrets
2. Consider rotating or deleting the associated AWS IAM user access keys

### Step 8: Test the Workflow

Test the deployment workflow:

1. **Manual trigger**: Go to Actions → Deploy to Amazon ECS → Run workflow
2. **Push to main**: Make a commit and push to the `main` branch
3. Monitor the workflow run and check for any authentication errors

If you encounter errors, verify:

- The OIDC provider is correctly set up in AWS
- The IAM role trust policy matches your repository and branch
- The `AWS_ACCOUNT_ID` secret is correctly set
- All placeholder values in policies and task definition are replaced

## ECS Infrastructure Requirements

Before running the workflow, ensure the following AWS resources exist:

1. **ECR Repository**: `typescript-container` in `ap-northeast-1`
   - **Important**: The ECR repository must be created manually before the first deployment, as the permissions policy does not include `ecr:CreateRepository` for security reasons
   - Create with: `aws ecr create-repository --repository-name typescript-container --region ap-northeast-1`
2. **ECS Cluster**: `typescript-container-cluster`
3. **ECS Service**: `typescript-container-service` (can be created by the first deployment)
4. **IAM Roles**:
   - `ecsTaskExecutionRole`: For ECS to pull images and write logs
   - `ecsTaskRole`: For the container to access AWS services (if needed)
5. **CloudWatch Log Group**: `/ecs/typescript-container`
6. **VPC Resources**: Subnets and security groups for ECS tasks

You can use the existing `setup-aws.sh` script (if available) or create these resources manually.

## Security Best Practices

### 1. Least Privilege

- Restrict IAM policies to only the actions and resources needed
- Use specific resource ARNs instead of wildcards (`*`) where possible
- Regularly review and audit IAM permissions

### 2. Trust Policy Restrictions

- Limit trust to specific repositories: `repo:RYA234/typescript-container:ref:refs/heads/main`
- Avoid using wildcards unless necessary
- Consider limiting to specific branches for production deployments

### 3. Branch Protection

- Enable branch protection rules for `main`
- Require pull request reviews before merging
- Enable status checks to prevent broken deployments

### 4. Environment Protection (Advanced)

For additional security, use GitHub Environments:

1. Create a production environment in repository settings
2. Add environment-specific secrets
3. Require manual approval for production deployments
4. Update the workflow to use the environment:

```yaml
jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production  # Add this line
    permissions:
      contents: read
      id-token: write
```

### 5. Monitoring and Alerts

- Enable AWS CloudTrail to log all API calls
- Set up CloudWatch alarms for unusual activity
- Monitor failed authentication attempts
- Review CloudWatch Logs for deployment issues

### 6. Credential Rotation

- OIDC tokens are automatically short-lived (no rotation needed)
- If using any long-lived credentials elsewhere, rotate them regularly
- Periodically review and update IAM policies

## Troubleshooting

### Error: "Not authorized to perform sts:AssumeRoleWithWebIdentity"

**Causes:**
- OIDC provider not set up in AWS
- Trust policy doesn't match the repository/branch
- Incorrect role ARN

**Solutions:**
- Verify OIDC provider exists: `aws iam list-open-id-connect-providers`
- Check trust policy repository name matches exactly (case-sensitive)
- Ensure branch name in trust policy matches (e.g., `main` vs `master`)

### Error: "The security token included in the request is invalid"

**Causes:**
- `id-token: write` permission missing from workflow
- Incorrect audience in trust policy

**Solutions:**
- Verify workflow has `permissions: id-token: write`
- Check trust policy has `"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"`

### Error: "User is not authorized to perform iam:PassRole"

**Causes:**
- IAM role lacks PassRole permission for task/execution roles

**Solutions:**
- Add `iam:PassRole` permission to the GitHubActionsRole
- Verify resource ARNs in PassRole statement match your task roles

### Error: "No such file or directory: .aws/task-definition.json"

**Causes:**
- Task definition file missing or in wrong location

**Solutions:**
- Ensure `.aws/task-definition.json` exists in repository root
- Verify file path in workflow matches actual location

### Deployment fails but authentication succeeds

**Causes:**
- ECS resources don't exist (cluster, service)
- Network configuration issues
- Insufficient permissions for ECS operations

**Solutions:**
- Create ECS infrastructure before first deployment
- Check CloudWatch Logs for detailed error messages
- Verify VPC, subnet, and security group configurations

## Additional Resources

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)

## Support

For issues with:
- **GitHub Actions**: Check workflow logs and GitHub Actions documentation
- **AWS Services**: Review CloudWatch Logs and AWS service documentation
- **This Repository**: Open an issue in the repository

---

**Last Updated**: 2025-11-21
