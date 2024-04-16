// server.js
const cors = require('cors');
const axios = require('axios');
const express = require('express');
const config = require('./config');

const app = express();



app.use(cors());

// Static files
app.use(express.static('public'));

app.get('/searchStudies', async (req, res) => {
  try {
    // const limit = req.query.limit || 100; // 获取请求中的limit参数，如果没有指定则默认为100
    const response = await axios.get(`${config.pacsServerUrl}/dicom-web/studies`, {
      headers: {
        'Accept': 'application/dicom+json'
      },
      params: {
        limit: 100, // 将limit参数传递给PACS服务器
      }
    });
    // Filter or transform the data as needed before sending it to the client
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching studies');
  }
});

// 在您的 Express 应用程序中添加一个新的路由处理程序来处理系列请求
app.get('/getSeries/:studyInstanceUID', async (req, res) => {
  const { studyInstanceUID } = req.params;

  try {
    const response = await axios.get(`${config.pacsServerUrl}/dicom-web/studies/${studyInstanceUID}/series`, {
      headers: {
        'Accept': 'application/dicom+json'
      }
    });

    // 将获取的系列数据发送回客户端
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching series');
  }
});

// 在您的 Express 应用程序中添加一个新的路由处理程序来处理系列请求
app.get('/getSOPInstance/:studyInstanceUID/series/:seriesInstanceUID', async (req, res) => {
  const { studyInstanceUID, seriesInstanceUID } = req.params;

  try {
    const response = await axios.get(`${config.pacsServerUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances`, {
      headers: {
        'Accept': 'application/dicom+json'
      }
    });

    // 将获取的系列数据发送回客户端
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching SOP');
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
