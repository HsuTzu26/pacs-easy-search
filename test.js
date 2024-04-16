const cors = require('cors');
const axios = require('axios');
const config = require('./config');

const pacsurl = config.pacsServerUrl;
const getinstance = axios.get(`${pacsurl}/studies`);
getinstance
    .then((res) => {
        console.log(res.data)
    })
    .catch ((e) => {
        console.log(e)
    });

