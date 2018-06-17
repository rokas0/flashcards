const rp = require('request-promise');
const readline = require('readline');

const endpointUrlSource = 'https://mwo9q58exe.execute-api.eu-west-1.amazonaws.com/Prod/flashcard';
const endpointUrlSink = 'http://localhost:8765';
const syncSavePeriodMs = 20000;

const getAnkiResponse = async (deck) => {
  let resp;
  try {
    console.log(`Deck: ${deck}`);
    resp = await rp(endpointUrlSource, {
      qs: {
        deck,
      },
    });
  } catch (err) {
    console.log(err);
  }
  return resp;
};

const pushFlashcards = async (deck) => {
  try {
    const body = await getAnkiResponse(deck);
    console.log(body);
    const res = await rp.post(endpointUrlSink, {
      body,
    });
    console.log(`Anki response: ${res.toString().replace(/null, /g, '')}`);
  } catch (err) {
    console.log(err);
  }
};

const saveFlashcards = async (flashcards, deck) => {
  let res;
  try {
    res = await rp.put(endpointUrlSource, {
      body: flashcards.join('\n'),
      qs: {
        deck,
      },
    });
  } catch (err) {
    console.log(`API ERROR: ${err}`);
  }
  console.log(flashcards);
  console.log(`API response:${res}`);
  pushFlashcards(deck);
  // TODO Save + sync with Anki
};


require('yargs') // eslint-disable-line
  .command('add', 'Adds the card. Card should be triple hyphen separated. For example `frontside---backside`', (yargs) => {
    yargs
      .positional('card', {
        describe: 'text separated by triple dashes ---',
      });
  }, (argv) => {
    console.log('Add new card separated by triple hyphen (---) between front side and back side');
    console.log(argv);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Card> ',
    });
    let timeLast = new Date().getTime();
    let timeNow;

    let stackFlashcards = [];
    rl.prompt();

    rl.on('line', async (input) => {
      if (input.length > 5) {
        input.split('\n').forEach(line => stackFlashcards.push(line));
      }

      timeNow = new Date().getTime();
      // console.log(timeLast-timeNow);
      if (timeNow - timeLast > syncSavePeriodMs) {
        timeLast = timeNow;
        try {
          console.log(stackFlashcards);
          await saveFlashcards(stackFlashcards, argv.deck);
          stackFlashcards = [];
        } catch (err) {
          console.log(`Error saving ${err}`);
        }
      }
    }).on('close', async () => {
      await saveFlashcards(stackFlashcards, argv.deck);
    });
  })
  .command('sync', 'Syncs cards', () => {}, async (argv) => {
    if (argv.verbose) console.info(`Syncing ${argv.card}`);
    pushFlashcards(argv.deck);
  })
  .option('deck', {
    alias: 'd',
    default: 'Default',
  })
  .option('verbose', {
    alias: 'v',
    default: true,
  })
  .argv;
