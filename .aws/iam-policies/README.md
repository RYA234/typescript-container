# IAM Policy Examples for GitHub Actions OIDC

This directory contains example IAM policies needed to set up GitHub Actions OIDC authentication.

## Files

- **trust-policy.json**: Trust policy for the IAM role that allows GitHub Actions to assume the role
- **permissions-policy.json**: Permissions policy that grants the role access to ECR and ECS

## Usage

**Before using these policies, replace the following placeholders:**

- `ACCOUNT_ID`: Your AWS account ID (12-digit number)

### Creating the IAM Role

```bash
# 1. Update trust-policy.json with your ACCOUNT_ID
sed -i 's/ACCOUNT_ID/123456789012/g' .aws/iam-policies/trust-policy.json

# 2. Update permissions-policy.json with your ACCOUNT_ID
sed -i 's/ACCOUNT_ID/123456789012/g' .aws/iam-policies/permissions-policy.json

# 3. Create the IAM role
aws iam create-role \
  --role-name GitHubActionsRole \
  --assume-role-policy-document file://.aws/iam-policies/trust-policy.json \
  --description "Role for GitHub Actions to deploy to ECS"

# 4. Attach the permissions policy
aws iam put-role-policy \
  --role-name GitHubActionsRole \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://.aws/iam-policies/permissions-policy.json
```

## Trust Policy Options

### Restrict to main branch only (recommended for production)
```json
"token.actions.githubusercontent.com:sub": "repo:RYA234/typescript-container:ref:refs/heads/main"
```

### Allow all branches (for testing)
```json
"token.actions.githubusercontent.com:sub": "repo:RYA234/typescript-container:*"
```

### Allow multiple specific branches
```json
"token.actions.githubusercontent.com:sub": [
  "repo:RYA234/typescript-container:ref:refs/heads/main",
  "repo:RYA234/typescript-container:ref:refs/heads/develop"
]
```

## Security Hardening

For production environments, consider restricting the permissions policy resources:

### ECR - Restrict repository-specific operations

Note: Some ECR actions operate at different levels:
- **Registry level** (requires `Resource: "*"`): `ecr:GetAuthorizationToken`
- **Repository level** (can be restricted): `ecr:PutImage`, `ecr:BatchCheckLayerAvailability`, etc.

Example of mixed resource restrictions:
```json
{
  "Sid": "ECRAuthToken",
  "Effect": "Allow",
  "Action": "ecr:GetAuthorizationToken",
  "Resource": "*"
},
{
  "Sid": "ECRRepositoryAccess",
  "Effect": "Allow",
  "Action": [
    "ecr:BatchCheckLayerAvailability",
    "ecr:GetDownloadUrlForLayer",
    "ecr:PutImage",
    "ecr:InitiateLayerUpload",
    "ecr:UploadLayerPart",
    "ecr:CompleteLayerUpload"
  ],
  "Resource": "arn:aws:ecr:ap-northeast-1:ACCOUNT_ID:repository/typescript-container"
}
```

### ECS - Restrict to specific service
```json
{
  "Sid": "ECSPermissions",
  "Effect": "Allow",
  "Action": [...],
  "Resource": "arn:aws:ecs:ap-northeast-1:ACCOUNT_ID:service/typescript-container-cluster/typescript-container-service"
}
```

## More Information

See the main [SETUP_OIDC.md](../../SETUP_OIDC.md) guide for complete setup instructions.
