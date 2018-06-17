const AWS = require('aws-sdk'); // eslint-disable-line import/no-unresolved

const tableName = process.env.DYNAMO_TABLE;

const getDeckName = event => (!event.queryStringParameters || typeof event.queryStringParameters.deck === 'undefined' ? 'Default' : event.queryStringParameters.deck);

const getRequestedOutput = () => 'anki';

const getDBResults = async (event) => {
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: tableName,
    FilterExpression: 'deck = :deck',
    ExpressionAttributeValues: {
      ':deck': getDeckName(event),
    },
  };

  return docClient.scan(params).promise();
};

const convertDynamodbJsonToJson = dynamodbJson => dynamodbJson.Items.map((item) => {
  if (typeof item.side0 === 'undefined') return null;
  const { side0 } = item;
  const side1 = (typeof item.side1 === 'undefined' ? '' : item.side1);
  const deck = (typeof item.deck === 'undefined' ? 'Default' : item.deck);
  const tags = (typeof item.tags === 'undefined' ? 'os_flashcards' : item.tags);
  return {
    side0,
    side1,
    deck,
    tags,
  };
}).filter(item => item !== null);

const convertJsonToAnkiJson = json => ({
  action: 'addNotes',
  version: 6,
  params: {
    notes: json.map(item => ({
      deckName: item.deck,
      modelName: 'Basic',
      fields: {
        Front: item.side0,
        Back: item.side1,
      },
      tags: [
        item.tags,
      ],
    })),
  },
});


exports.lambdaHandler = async (event) => {
  console.log(event);
  try {
    const dynamodbResult = await getDBResults(event);
    console.log(dynamodbResult);
    const flashcardJson = convertDynamodbJsonToJson(dynamodbResult);

    switch (getRequestedOutput(event)) {
      case 'anki':
      default:
        return {
          statusCode: 200,
          body: JSON.stringify(convertJsonToAnkiJson(flashcardJson)),
        };
    }
  } catch (err) {
    console.log(err);
    return err;
  }
};
