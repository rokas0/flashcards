build:
	sam build --region eu-west-1

package:
	sam package --s3-bucket rokaso-sam-package --profile os --output-template-file packaged.yaml

deploy:
	sam deploy --template-file /Users/oro01/projects/flashcards/sam-app/packaged.yaml --stack-name flashcards3 --profile os --capabilities CAPABILITY_IAM

all: build package deploy