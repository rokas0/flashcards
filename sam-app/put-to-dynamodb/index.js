const AWS = require('aws-sdk');

const tableName = process.env.DYNAMO_TABLE;

const saveFlashcardsToDynamoDb = async (item) => {
	item.create_timestamp = Date.now();
	var params = {
		TableName: tableName,
		Item: item
	};

	var documentClient = new AWS.DynamoDB.DocumentClient();
	return documentClient.put(params).promise();
};

exports.handler = async (event) => {
	console.log(event);

	const item = JSON.parse(event.Records[0].body);
	const results = await saveFlashcardsToDynamoDb(item);
	console.log(results);
};
