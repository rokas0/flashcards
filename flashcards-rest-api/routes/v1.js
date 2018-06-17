const express 			= require('express');
const router 			= express.Router();

const HomeController 	= require('./../controllers/HomeController');
const FlashcardController 	= require('./../controllers/FlashcardController');

const passport      	= require('passport');
const path              = require('path');


//require('./../middleware/passport')(passport)
/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({status:"success", message:"Parcel Pending API", data:{"version_number":"v1.0.0"}})
});


router.get('/dash', passport.authenticate('jwt', {session:false}),HomeController.Dashboard);

router.post(     '/flashcards',    FlashcardController.create);
router.get(      '/flashcards',    FlashcardController.getAll);                  // R


//********* API DOCUMENTATION **********
router.use('/docs/api.json',            express.static(path.join(__dirname, '/../public/v1/documentation/api.json')));
router.use('/docs',                     express.static(path.join(__dirname, '/../public/v1/documentation/dist')));
module.exports = router;
