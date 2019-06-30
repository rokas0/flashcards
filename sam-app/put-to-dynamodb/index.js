const AWS = require('aws-sdk'); // eslint-disable-line import/no-unresolved

let response;
const tableName = process.env.DYNAMO_TABLE;

const getDeckName = event => (event.queryStringParameters == null || typeof event.queryStringParameters.deck === 'undefined' ? 'Default' : event.queryStringParameters.deck);

const saveFlashcardsToDynamoDb = async (item) => {
  item.create_timestamp = Date.now();
  var params = {
    TableName: tableName,
    Item: item
  };
  
  var documentClient = new AWS.DynamoDB.DocumentClient();
  return documentClient.put(params).promise();
};

exports.lambdaHandler = async (event) => {
  console.log(event);

  const item = JSON.parse(event.Records[0].body);
  try {
    const results = await saveFlashcardsToDynamoDb(item);
    console.log(results);
  } catch (err) {
    console.log(err);
    response = {
      statusCode: 500,
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    };
  }

  return response;
};
