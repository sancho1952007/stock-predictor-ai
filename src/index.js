import { Elysia } from "elysia";
const axios = require('axios');
const path = require('path');

const app = new Elysia();
const __dirname = path.dirname(import.meta.path);

app.get('/', (req) => {
  return Bun.file(path.join(__dirname, 'public', 'index.html'));
});

app.get('/js/live.js', (req) => {
  return Bun.file(path.join(__dirname, 'public', 'js', 'live.js'));
});

app.get('/images/loader.gif', (req) => {
  return Bun.file(path.join(__dirname, 'public', 'images', 'loader.gif'));
});

app.get("/get/:stock", async (req) => {
  let request = await axios.post('https://api.newsfilter.io/search?token=' + Bun.env.NEWS_FILTER_API_KEY, {
    "queryString": "symbols:" + req.params.stock,
    "from": 0,
    "size": 10
  });

  if (request.data != null) {
    let pos_count = 0;
    let neg_count = 0;

    for (let i = 0; i < request.data.articles.length; i++) {
      let sentimentAnalysis = await axios.post('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=' + Bun.env.MAKESUIT_API_KEY, {
        "prompt": {
          "text": 'Analyze the sentiment if it is (answer in positive or negative only) of the below news of the stock: ' + request.data.articles[i].description + '. Do the sentiment for the stock in favour of ' + req.params.stock
        },
        "temperature": 0.5
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (sentimentAnalysis.data != null) {
        if (sentimentAnalysis.data.candidates != null && sentimentAnalysis.data.candidates.length > 0) {
          console.log(request.data.articles[i].description + ': ' + sentimentAnalysis.data.candidates[0].output.toLowerCase().trim() + '\n');
          if (sentimentAnalysis.data.candidates[0].output.toLowerCase().trim() == 'positive') {
            pos_count++;
          }
          else if (sentimentAnalysis.data.candidates[0].output.toLowerCase().trim() == 'negative') {
            neg_count++;
          }
          else {
            console.log('Invalid Data: ' + sentimentAnalysis.data.candidates[0].output.toLowerCase() + '\n');
          }
        }
      } else {
        return { success: false, error: 'Falied To Check The Sentiment Of The Stock!' };
      }
    }

    console.log('Positive:' + pos_count, ', Negative: ' + neg_count);
    if (!(pos_count == 0 && neg_count == 0)) {
      if (pos_count > neg_count) {
        return { success: true, positive: pos_count, negative: neg_count, best_option: 'buy' };
      }
      else if (pos_count == neg_count) {
        return { success: true, positive: pos_count, negative: neg_count, best_option: 'nothing' };
      }
      else if (pos_count < neg_count) {
        return { success: true, positive: pos_count, negative: neg_count, best_option: 'sell' };
      }
    }
    else {
      return { success: false, error: 'Internal Error!' };
    }
  }
  else {
    return { success: false, error: 'Failed To Fetch Stock!' };
  }
});

app.listen(3000);