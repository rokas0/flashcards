'use strict';

const request = require('request');

const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
});

const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const table = 'flashcards';
const syncSavePeriodMs = 500;
const ankiServerUrl = 'http://localhost:8764';

// TECHDEBT: Add loading from config

const readline = require('readline');

let timeLast = new Date().getTime();
const stackFlashcards = [];
let timeNow;

function saveFlashcardsToDynamoDb() {
    const json = {
        RequestItems: {
            flashcards: [],
        },
    };

    stackFlashcards.forEach((input) => {
        const flashcardSides = input.split('---');
        const frontSide = flashcardSides[0];
        const backSide = flashcardSides.slice(1).join('---');

        if (frontSide) {
            console.log(`Debug: ${frontSide}---${backSide} `);
            const addNoteData = {
                PutRequest: {
                    Item: {
                        frontSide: { S: frontSide },
                        backSide: { S: backSide },
                        tags: { S: 'os_flashcards' },
                    },
                },
            };
            json.RequestItems.flashcards.push(addNoteData);
        }
    });

    if (json.RequestItems.flashcards.length < 1) {
        // Too little items. Not syncing
    } else if (json.RequestItems.flashcards.length > 25) {
        console.log('Too many cards. Cannot sync with DynamoDb');
    } else {
        ddb.batchWriteItem(json, (err, data) => {
            if (err) {
                console.log('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
                console.log('Debug log');
                console.log(json.RequestItems.flashcards);
            } else {
                //      console.log('Added items to DynamoDb');
            }
        });
    }
}

function getDeckName() {
    if (typeof argv.d !== 'undefined') {
        return argv.d;
    } else if (typeof argv.deck !== 'undefined') {
        return argv.deck;
    }
    return 'Default';
}

const handlingAnkiConnectResponse = function anon(error, response, bodyString) {
    // TODO Add here validation. If response is not 200, then open Anki message
    const body = JSON.parse(bodyString);
    if (typeof body !== 'undefined' && body) {
        if (body.error !== null) {
            console.log(`Error! ${body.error}`);
        }
    }
};

function saveFlashcards() {
    console.log('--Saving');
    saveFlashcardsToDynamoDb();
    const json = {
        action: 'addNotes',
        version: 5,
        params: {
            notes: [],
        },
    };

    stackFlashcards.forEach((input) => {
        const flashcardSides = input.split('---');
        const frontSide = flashcardSides[0];
        const backSide = flashcardSides.slice(1).join('---');

        const addNoteData = {
            deckName: getDeckName(),
            modelName: 'Basic',
            fields: {
                Front: frontSide,
                Back: backSide,
            },
            tags: [
                'os_flashcards',
            ],
        };

        json.params.notes.push(addNoteData);
    });

    stackFlashcards.splice(0, stackFlashcards.length);
    request({
        uri: ankiServerUrl,
        method: 'POST',
        body: JSON.stringify(json),
    }, handlingAnkiConnectResponse);
}


function syncFlashcardsAnkiWeb() {
    console.log('Syncing with AnkiWeb');

    request({
        uri: ankiServerUrl,
        method: 'POST',
        body: JSON.stringify({
            action: 'sync',
            version: 5,
        }),
    }, handlingAnkiConnectResponse);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


const recursiveAsyncReadLine = function (argv) {
    this.argv = argv;

    rl.question('Card: ', (input) => {
        if (input === 'exit') {
            return rl.close();
        }

        stackFlashcards.push(input);
        timeNow = new Date().getTime();
        if (timeNow - timeLast > syncSavePeriodMs) {
            saveFlashcards();
            timeLast = timeNow;
        }
        recursiveAsyncReadLine();
    });
};

function exitHandler(options, err) {
    saveFlashcards();
    syncFlashcardsAnkiWeb();

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) console.log('EXIT');
}

/*
process.on('exit', exitHandler.bind(null, { cleanup: true }));
// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
*/

module.exports = function (argv) {
    recursiveAsyncReadLine(argv);
};
