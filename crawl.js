const rp = require('request-promise');
const fs = require('fs');

const zhiweiConfig = {
  baseUrl: 'http://zhiwen.raydonet.com/'
};

const authConfig = {
  app_key: "201704171918567238127",
  app_token: "201704171918567238128",
};

getQuestionsList()
  .then(result => {
    console.log('result is ', result);
  })
  .catch(err => console.log('err is ', err));
async function getQuestionsList() {
  const options = {
    method: 'POST',
    url: `${zhiweiConfig.baseUrl}questionsInfoInterface/getQuestionsList`,
    qs: authConfig
  };
  let res;
  try {
    res = await rp(options);
  } catch (e) {
    console.error('getQuestionsList failed. ', 'error is ', e);
    return e;
  }
  res = JSON.parse(res);
  const list = res.result;
  await saveQuestionsList(list);
  return res;
}

async function saveQuestionsList(list) {
  for (let i = 0; i < list.length; i++) {
    const superQuestions = list[i];
    const path = `./${superQuestions.questionsName}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    const standardList = superQuestions.questionsInfoStandardList;
    if (standardList.length === 0) {
      continue;
    }
    for(let j = 0; j < standardList.length; j++) {
      const questions = standardList[j];
      const subPath = `${path}/${questions.questionsName}`;
      const fileName = `${questions.questionsName}.json`;
      if (!fs.existsSync(subPath)) {
        fs.mkdirSync(subPath);
        fs.mkdirSync(`${path}/pic`);
      }
      let questionsData;
      try {
        questionsData = await getQuestions({ questionsId: questions.questionsId, limit: questions.examinationNumber, });
        // crawl image
      } catch (e) {
        console.error('getQuestions failed. ', 'err is ', e);
        continue;
      }
      fs.writeFile(`${subPath}/${fileName}`, JSON.stringify(questionsData, null, 2), 'utf-8');
      const reg = /(zhiwen\/subjejctInfoFolder\/root\/)(\w)+(.png)/g;
      const imageArray = JSON.stringify(questionsData).match(reg);
      console.log('imageArray is ', imageArray);
      await saveImage(imageArray, subPath);
    }
  }
  console.log('buildFolder finished');
  return ;
}

async function saveImage(array, path) {
  for (let i = 0; i < array.length; i++) {
    const imageUrl = array[i];
    const tempArray = imageUrl.split('/');
    const imageName = tempArray[tempArray.length - 1];
    const options = {
      method: 'GET',
      url: `${zhiweiConfig.baseUrl}${imageUrl}`,
      encoding: 'binary'
    };
    console.log('options is ', options, 'imageName is ', imageName);
    let res = await rp(options);
    await fs.writeFile(`${path}/${imageName}`, res, 'binary');
  }
  console.log('saveImage finished');
  return;
}

function getQuestions(params) {
  params.type = 1;
  params.since_id = 0;
  params.direct = 0;
  const options = {
    method: 'POST',
    url: `${zhiweiConfig.baseUrl}subjectInterface/casuallyPractice`,
    qs: Object.assign(authConfig, params)
  };
  return rp(options)
    .then(res => {
      try {
        res = JSON.parse(res)
      } catch (e) {
        console.log('parse failed. ', 'err is ', e);
        return;
      }
      if (res.result) {
        return res.result.subjectInfoList
      }
      console.log('res is ', res);
      return [];
    })
}
