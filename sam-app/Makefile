STACK_NAME?=flashcards7
AWS_PROFILE?=sam
AWS_REGION?=eu-west-1
S3_BUCKET_PACKAGED?=rokaso-sam-package

lintfix:
	./node_modules/.bin/eslint ./*/index.js 

build:
	sam build --region ${AWS_REGION}

package:
	sam package --s3-bucket ${S3_BUCKET_PACKAGED} --profile ${AWS_PROFILE} --output-template-file packaged.yaml

deploy:
	sam deploy --stack-name ${STACK_NAME} --profile ${AWS_PROFILE} --template-file /Users/oro01/projects/flashcards/sam-app/packaged.yaml --capabilities CAPABILITY_IAM

describe:
	aws cloudformation describe-stacks --stack-name ${STACK_NAME} --profile ${AWS_PROFILE} --output text

all: lintfix build package deploy describe