const AWS = require('aws-sdk'); // eslint-disable-line import/no-unresolved
const { unmarshal } = require('dynamodb-marshaler');
const Papa = require('papaparse');

const headers = [];
const unMarshalledArray = [];
const TableName = process.env.DYNAMO_TABLE;

const dynamoDB = new AWS.DynamoDB();

const queryGlobal = {
  TableName,
  Limit: 1000,
};

let response;

function unMarshalIntoArray(items) {
  if (items.length === 0) return;

  items.forEach((row) => {
    const newRow = {};

    // console.log( 'Row: ' + JSON.stringify( row ));
    Object.keys(row).forEach((key) => {
      if (headers.indexOf(key.trim()) === -1) {
        // console.log( 'putting new key ' + key.trim() + ' into headers ' + headers.toString());
        headers.push(key.trim());
      }
      const newValue = unmarshal(row[key]);

      if (typeof newValue === 'object') {
        newRow[key] = JSON.stringify(newValue);
      } else {
        newRow[key] = newValue;
      }
    });

    // console.log( newRow );
    unMarshalledArray.push(newRow);
  });
}

const scanDynamoDB = async (query) => {
  let endData;
  try {
    const data = await dynamoDB.scan(query).promise();
    unMarshalIntoArray(data.Items); // Print out the subset of results.
    if (data.LastEvaluatedKey) { // Result is incomplete; there is more to come.
      const newQuery = query;
      newQuery.ExclusiveStartKey = data.LastEvaluatedKey;
      await scanDynamoDB(newQuery);
    } else {
      endData = Papa.unparse({
        fields: [...headers],
        data: unMarshalledArray,
      });
    }
  } catch (err) {
    throw new Error(`Dynamodb failed scan ${err}`);
  }

  return endData;
};

exports.lambdaHandler = async (event) => {
  console.log(event);

  try {
    const body = await scanDynamoDB(queryGlobal);
    response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-disposition': `attachment; filename=csvExportDynamo${new Date().toISOString()}.csv`,
      },
      body,
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
