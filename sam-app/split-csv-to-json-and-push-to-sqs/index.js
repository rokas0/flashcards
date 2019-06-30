const AWS = require('aws-sdk'); // eslint-disable-line import/no-unresolved
const sqs = new AWS.SQS();

let response;
const getDeckName = event => (event.queryStringParameters == null || typeof event.queryStringParameters.deck === 'undefined' ? 'Default' : event.queryStringParameters.deck);

const convertTripleHyphenSeparatedStringToArray = inputString => inputString.split('---');

const convertNewLineSeparatedStringToArray = inputString => inputString.split('\n');


exports.lambdaHandler = async (event) => {
  console.log(event);
  
	try {
    const body = event.Records[0].body;
    const input = convertNewLineSeparatedStringToArray(body)
			.map(line => convertTripleHyphenSeparatedStringToArray(line));

		const deck = 'Default'; // TODO Update this to get from the event

		console.log(input);

		input.forEach((card) => {
			const side0 = card[0];
			const side1 = (typeof card[1] === 'undefined' || card[1].length === 0 ? ' ' : card[1]);
			if (side0) {
				const row = {
					side0,
					side1,
					deck
				}

				let params = {
					MessageBody: JSON.stringify({
						row
					}),
					QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/815840080813/flashcard-process-csv',
				};
				sqs.sendMessage(params).promise();
			}
		});
	} catch (err) {
		console.log(err);
		response = {
			statusCode: 500,
			body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
		};
	}

	return response;
};
