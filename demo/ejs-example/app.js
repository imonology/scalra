var express = require('express'),
  app = express(),
    ejs = require('../../modules/ejs-wrapper.js');

let ejsOptions = {delimiter: '?'};
app.engine('ejs', ejs);
app.set('views',__dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')

app.locals.partial = ejs.partial;
app.locals.block = ejs.block;
app.locals.layout = ejs.layout;

// render 'index' into 'boilerplate':
app.get('/',function(req,res,next){
  res.render('index', { what: 'best', who: 'me', muppets: [ 'Kermit', 'Fozzie', 'Gonzo' ] });
});

app.listen(3000);
