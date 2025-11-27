#!/bin/bash
# このスクリプトは AWS リソースを作成するためのヘルパースクリプトです
# 使用前に AWS CLI が設定されていることを確認してください

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 設定値（必要に応じて変更してください）
AWS_REGION="ap-northeast-1"
ECR_REPO_NAME="typescript-container"
ECS_CLUSTER_NAME="typescript-container-cluster"
ECS_SERVICE_NAME="typescript-container-service"
LOG_GROUP_NAME="/ecs/typescript-container"
SECURITY_GROUP_NAME="typescript-container-sg"
TASK_FAMILY="typescript-container-task"

echo -e "${GREEN}=== TypeScript Container ECS Setup ===${NC}"
echo ""

# AWS アカウント ID を取得
echo -e "${YELLOW}AWS アカウント情報を取得中...${NC}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "AWS Account ID: ${GREEN}${AWS_ACCOUNT_ID}${NC}"
echo ""

# 1. ECR リポジトリの作成
echo -e "${YELLOW}1. ECR リポジトリを作成中...${NC}"
if aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} >/dev/null 2>&1; then
    echo -e "${GREEN}✓ ECR リポジトリは既に存在します${NC}"
else
    aws ecr create-repository \
        --repository-name ${ECR_REPO_NAME} \
        --region ${AWS_REGION}
    echo -e "${GREEN}✓ ECR リポジトリを作成しました${NC}"
fi
echo ""

# 2. CloudWatch ロググループの作成
echo -e "${YELLOW}2. CloudWatch ロググループを作成中...${NC}"
if aws logs describe-log-groups --log-group-name-prefix ${LOG_GROUP_NAME} --region ${AWS_REGION} | grep -q ${LOG_GROUP_NAME}; then
    echo -e "${GREEN}✓ ロググループは既に存在します${NC}"
else
    aws logs create-log-group \
        --log-group-name ${LOG_GROUP_NAME} \
        --region ${AWS_REGION}
    echo -e "${GREEN}✓ ロググループを作成しました${NC}"
fi
echo ""

# 3. ECS クラスターの作成
echo -e "${YELLOW}3. ECS クラスターを作成中...${NC}"
if aws ecs describe-clusters --clusters ${ECS_CLUSTER_NAME} --region ${AWS_REGION} | grep -q "ACTIVE"; then
    echo -e "${GREEN}✓ ECS クラスターは既に存在します${NC}"
else
    aws ecs create-cluster \
        --cluster-name ${ECS_CLUSTER_NAME} \
        --region ${AWS_REGION}
    echo -e "${GREEN}✓ ECS クラスターを作成しました${NC}"
fi
echo ""

# 4. タスク定義ファイルの更新
echo -e "${YELLOW}4. タスク定義ファイルを更新中...${NC}"
TASK_DEF_FILE=".aws/task-definition.json"
if [ -f ${TASK_DEF_FILE} ]; then
    # タスク定義の AWS アカウント ID を置換
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i .bak "s/YOUR_AWS_ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" ${TASK_DEF_FILE}
    else
        sed -i "s/YOUR_AWS_ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" ${TASK_DEF_FILE}
    fi
    rm -f ${TASK_DEF_FILE}.bak
    echo -e "${GREEN}✓ タスク定義ファイルを更新しました${NC}"
else
    echo -e "${RED}✗ タスク定義ファイルが見つかりません: ${TASK_DEF_FILE}${NC}"
    exit 1
fi
echo ""

# 5. タスク定義の登録
echo -e "${YELLOW}5. タスク定義を登録中...${NC}"
aws ecs register-task-definition \
    --cli-input-json file://${TASK_DEF_FILE} \
    --region ${AWS_REGION}
echo -e "${GREEN}✓ タスク定義を登録しました${NC}"
echo ""

# 6. VPC とサブネット情報の取得
echo -e "${YELLOW}6. VPC とサブネット情報を取得中...${NC}"
DEFAULT_VPC=$(aws ec2 describe-vpcs \
    --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" \
    --output text \
    --region ${AWS_REGION})
if [ "${DEFAULT_VPC}" = "None" ] || [ -z "${DEFAULT_VPC}" ]; then
    echo -e "${RED}✗ デフォルト VPC が見つかりません${NC}"
    echo -e "${YELLOW}カスタム VPC を使用する場合は、手動でセキュリティグループとサービスを作成してください${NC}"
    exit 1
fi
echo -e "Default VPC: ${GREEN}${DEFAULT_VPC}${NC}"

SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${DEFAULT_VPC}" \
    --query "Subnets[*].SubnetId" \
    --output text \
    --region ${AWS_REGION})
SUBNET_ARRAY=(${SUBNETS})
SUBNET1=${SUBNET_ARRAY[0]}
SUBNET2=${SUBNET_ARRAY[1]:-$SUBNET1}
echo -e "Subnets: ${GREEN}${SUBNET1}, ${SUBNET2}${NC}"
echo ""

# 7. セキュリティグループの作成
echo -e "${YELLOW}7. セキュリティグループを作成中...${NC}"
EXISTING_SG=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" \
              "Name=vpc-id,Values=${DEFAULT_VPC}" \
    --query "SecurityGroups[0].GroupId" \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || echo "None")
if [ "${EXISTING_SG}" != "None" ] && [ -n "${EXISTING_SG}" ]; then
    SECURITY_GROUP_ID=${EXISTING_SG}
    echo -e "${GREEN}✓ セキュリティグループは既に存在します: ${SECURITY_GROUP_ID}${NC}"
else
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name ${SECURITY_GROUP_NAME} \
        --description "Security group for typescript container" \
        --vpc-id ${DEFAULT_VPC} \
        --region ${AWS_REGION} \
        --query 'GroupId' \
        --output text)
    
    aws ec2 authorize-security-group-ingress \
        --group-id ${SECURITY_GROUP_ID} \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0 \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✓ セキュリティグループを作成しました: ${SECURITY_GROUP_ID}${NC}"
fi
echo ""

# 8. ECS サービスの作成
echo -e "${YELLOW}8. ECS サービスを作成中...${NC}"
EXISTING_SERVICE=$(aws ecs describe-services \
    --cluster ${ECS_CLUSTER_NAME} \
    --services ${ECS_SERVICE_NAME} \
    --region ${AWS_REGION} \
    --query "services[0].status" \
    --output text 2>/dev/null || echo "None")
if [ "${EXISTING_SERVICE}" = "ACTIVE" ]; then
    echo -e "${GREEN}✓ ECS サービスは既に存在します${NC}"
else
    aws ecs create-service \
        --cluster ${ECS_CLUSTER_NAME} \
        --service-name ${ECS_SERVICE_NAME} \
        --task-definition ${TASK_FAMILY} \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration \
            "awsvpcConfiguration={subnets=[${SUBNET1},${SUBNET2}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
        --region ${AWS_REGION}
    echo -e "${GREEN}✓ ECS サービスを作成しました${NC}"
    echo -e "${YELLOW}注意: assignPublicIp=ENABLED はテスト用です。本番環境では ALB とプライベートサブネットの使用を推奨します${NC}"
fi
echo ""

echo -e "${GREEN}=== セットアップ完了 ===${NC}"
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "1. GitHub リポジトリの Settings > Secrets に以下を追加:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo ""
echo "2. .github/workflows/deploy-to-ecs.yml の環境変数を確認"
echo ""
echo "3. main ブランチにプッシュして自動デプロイを実行"
echo ""
echo -e "${YELLOW}リソース情報:${NC}"
echo "ECR Repository: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"
echo "ECS Cluster: ${ECS_CLUSTER_NAME}"
echo "ECS Service: ${ECS_SERVICE_NAME}"
echo "Security Group: ${SECURITY_GROUP_ID}"
