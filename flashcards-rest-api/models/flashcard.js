const dynamoose = require('dynamoose');

let FlashcardSchema = new dynamoose.Schema({
  uuid: {
    type: String,
    hashKey: true,
  },
  timestamp: String,
	side0: String,
	side1: String,
}, {
	throughput: {
		read: 1,
		write: 1
  },
  timestamps: true,
  saveUnknown: true,
});

FlashcardSchema.statics.getAll = async function(cb){
  let results = await this.scan().exec()
  while (results.lastKey){
      results = await this.scan().startKey(results.startKey).exec()
  }
  return results
}

// FlashcardSchema.methods.toWeb = function () {
//   console.log('this')
//   console.log(this)
//   let json = this;
// 	json.id = this._id; //this is for the front end
// 	return json;
// };

let flashcard = module.exports = dynamoose.model('flashcards2', FlashcardSchema);
