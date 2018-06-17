const AWS = require('aws-sdk'); // eslint-disable-line import/no-unresolved

let response;
const tableName = process.env.DYNAMO_TABLE;

const getDeckName = event => (typeof event.queryStringParameters.deck === 'undefined' ? 'Default' : event.queryStringParameters.deck);

const saveFlashcardsToDynamoDb = async (cards, event) => {
  const json = {
    RequestItems: {
      [tableName]: [],
    },
  };

  const deck = getDeckName(event);

  console.log('stackFlashcards');
  cards.forEach((card) => {
    const side0 = card[0];
    const side1 = (typeof card[1] === 'undefined' || card[1].length === 0 ? ' ' : card[1]);
    if (side0) {
      const addNoteData = {
        PutRequest: {
          Item: {
            uuid: { S: `a${Math.random()}av` },
            deck: { S: deck },
            date_added: { S: new Date().toISOString() },
            side0: { S: side0 },
            side1: { S: side1 },
            tags: { S: 'os_flashcards' },
          },
        },
      };
      json.RequestItems[tableName].push(addNoteData);
    }
  });

  if (json.RequestItems[tableName].length < 1) {
    return 'Too little items. Not syncing';
  } if (json.RequestItems[tableName].length > 25) {
    // TODO So we can sync more than 25 items
    return 'Too many cards. Cannot sync with DynamoDb';
  }
  console.log(JSON.stringify(json));
  const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
  return ddb.batchWriteItem(json).promise();
};

const convertTripleHyphenSeparatedStringToArray = inputString => inputString.split('---');

const convertNewLineSeparatedStringToArray = inputString => inputString.split('\n');


exports.lambdaHandler = async (event) => {
  console.log(event);

  try {
    const input = convertNewLineSeparatedStringToArray(event.body)
      .map(line => convertTripleHyphenSeparatedStringToArray(line));

    const results = await saveFlashcardsToDynamoDb(input, event);
    response = {
      statusCode: 200,
      body: JSON.stringify({
        results,
      }),
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
