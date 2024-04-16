//script.js
// DICOM 標籤對應的 JSON 對象
const dicomTags = {
  "00100020": "PatientID",
  "00100010": "PatientName",
  "00080020": "StudyDate",
  "00080050": "Identifier", // AccessionNumber
  "0020000D": "StudyInstanceUID",
  "0020000E": "SeriesInstanceUID",
  "00080018": "SOPInstanceUID",
  "00080060": "Modality"
};

// 根据标签获取对应的值
function getValueByTag(study, tag) {
  if (study[tag] && Array.isArray(study[tag].Value)) {
    const valueArray = study[tag].Value;
    let formattedValue = '';
    for (const value of valueArray) {
      if (typeof value === 'object') {
        // 如果值是对象，则尝试从对象中提取 Alphabetic、Numeric、DateTime 或 PersonName 属性
        if ('Alphabetic' in value) formattedValue += value.Alphabetic + ' ';
        else if ('Numeric' in value) formattedValue += value.Numeric + ' ';
        else if ('DateTime' in value) formattedValue += value.DateTime + ' ';
        else if ('PersonName' in value) formattedValue += value.PersonName.Alphabetic + ' ';
      } else {
        // 否则直接将值添加到 formattedValue 中
        formattedValue += value + ' ';
      }
    }
    // 删除最后一个空格并返回结果
    return formattedValue.trim();
  } else {
    return '';
  }
}

async function viewStudyDetails(study) {
  const details = {
      PatientID: getValueByTag(study, '00100020'),
      PatientName: getValueByTag(study, '00100010'),
      StudyDate: getValueByTag(study, '00080020'),
      Modality: getValueByTag(study, '00080060'),
      AccessionNumber: getValueByTag(study, '00080050'),
      StudyInstanceUID: getValueByTag(study, '0020000D'),
      SeriesInstanceUID: getValueByTag(study, '0020000E'),
      SOPInstanceUID: getValueByTag(study, '00080018')
  };

  let [seriesInstanceUIDs, modalities] = await getSeriesInstanceUID(details.StudyInstanceUID);

  const detailsWindow = window.open('', 'Study Details', 'width=600,height=400');

  for (let i = 0; i < seriesInstanceUIDs.length; i++) {
    const series = seriesInstanceUIDs[i];
    const modality = modalities[i];
    const PatientName = encodeURIComponent(details.PatientName); // 对患者姓名进行 UTF-8 编码处理

    const SOPInstanceUIDs = await getSOPInstanceUID(details.StudyInstanceUID, series);
    if (SOPInstanceUIDs !== undefined) {    
      const html = `
        <html>
            <head>
                <title>Study Details</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    th, td {
                        border: 1px solid #dddddd;
                        text-align: left;
                        padding: 8px;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                </style>
            </head>
            <body>
                <h2>Study Details</h2>
                <table>
                    <tr><th>Attribute</th><th>Value</th></tr>
                    <tr><td>Patient ID</td><td>${details.PatientID}</td></tr>
                    <tr><td>Patient Name</td><td>${PatientName}</td></tr>
                    <tr><td>Study Date</td><td>${details.StudyDate}</td></tr>
                    <tr><td>Modality</td><td>${modality}</td></tr>
                    <tr><td>Accession Number</td><td>${details.AccessionNumber}</td></tr>
                    <tr><td>Study Instance UID</td><td>${details.StudyInstanceUID}</td></tr>
                    <tr><td>Series Instance UID</td><td>${series}</td></tr>
                    <tr><td>SOP Instance UID</td><td>${SOPInstanceUIDs}</td></tr>
                </table>
            </body>
        </html>
    `;
    detailsWindow.document.write(html);
    }
  }
}

async function getSeriesInstanceUID(studyInstanceUID) {
  try {
    const response = await axios.get(`http://localhost:3000/getSeries/${studyInstanceUID}`);
    const seriesInstanceUID = response.data.map(series => series["0020000E"].Value[0]);
    const modalities = response.data.map(series => series["00080060"].Value[0]);

    return [seriesInstanceUID, modalities]
  } catch (error) {
    console.error('Error fetching series:', error);
  }
}

async function getSOPInstanceUID(studyInstanceUID, seriesInstanceUID) {
  try {
    const response = await axios.get(`http://localhost:3000/getSOPInstance/${studyInstanceUID}/series/${seriesInstanceUID}`);
    const SOPInstanceUID = response.data.map(sopinstance => sopinstance["00080018"].Value[0]);

    return SOPInstanceUID
  } catch (error) {
    console.error('Error fetching series:', error);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const searchForm = document.getElementById('searchForm');
  const searchResultsTable = document.querySelector('.search-results tbody');

  let studiesList = []; // Array to hold the study objects

  // 获取所有输入框元素
  const inputFields = {
    patientID: document.getElementById('patientID'),
    patientName: document.getElementById('patientName'),
    fromDate: document.getElementById('fromDate'),
    toDate: document.getElementById('toDate'),
    modality: document.getElementById('modality'),
    identifier: document.getElementById('identifier')
  };

  searchForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    const formData = new FormData(searchForm);

    try {
      // Send GET request to the server to get search results
      const response = await axios.get('http://localhost:3000/searchStudies', {
        params: Object.fromEntries(formData.entries())
      });

      // Update studies list with the returned data
      studiesList = response.data;

      // Filter studiesList based on input values
      const searchData = {};
      for (const key in inputFields) {
        if (inputFields.hasOwnProperty(key)) {
          searchData[key] = inputFields[key].value.trim();
        }
      }

      // Check if any input field has a value
      const hasInput = Object.values(searchData).some(value => value.trim() !== '');

      if (hasInput) {
        searchStudies(searchData);
      } else {
        displayAllStudies();
      }
    } catch (error) {
      console.error('Error fetching studies:', error);
      alert('Error fetching studies. Please try again later.');
    }
  });

  
  // Function to display all studies
  function displayAllStudies() {
    // 清除搜索结果表格
    searchResultsTable.innerHTML = '';

    // 插入所有数据到表格中
    studiesList.forEach(study => {
      console.log(getValueByTag(study, '00100020'))
      const row = `<tr>
                      <td>${getValueByTag(study, '00100020')}</td>
                      <td>${getValueByTag(study, '00100010')}</td>
                      <td>${getValueByTag(study, '00080020')}</td>
                      <td>${getValueByTag(study, '00080050')}</td>
                      <td><button onclick="viewStudyDetails(${JSON.stringify(study).replace(/"/g, '&quot;')})">View Details</button></td>
                  </tr>`;
      searchResultsTable.insertAdjacentHTML('beforeend', row);
    });
  }

  function searchStudies(searchData) {
    // Create a new list to store the matching studies
    let matchingStudies = [];
    let searchResults = [];

    for (let key in searchData) {
      if (searchData[key] === '') continue;
      else searchResults.push(searchData[key]);
    }

    for (let study of studiesList) {
      
      if (study["00100020"].Value[0] !== undefined || study["00080050"].Value[0] !== undefined){
        for(let value of searchResults){
          if (study["00100020"].Value[0] === value.toString()) matchingStudies.push(study); // PatientID           
          if (study['00080050'].Value[0] === value.toString()) matchingStudies.push(study); // AccessionNumber
        }
      }
    }

    console.log(matchingStudies)

  
    // Display the matching studies
    displayStudies(matchingStudies);
  }
  

  function displayStudies(studies) {
    // Clear the existing results
    searchResultsTable.innerHTML = '';
  
    // Insert all data into the table
    studies.forEach(study => {
      const row = `<tr>
                      <td>${getValueByTag(study, '00100020')}</td>
                      <td>${getValueByTag(study, '00100010')}</td>
                      <td>${getValueByTag(study, '00080020')}</td>
                      <td>${getValueByTag(study, '00080050')}</td>
                      <td><button onclick="viewStudyDetails(${JSON.stringify(study).replace(/"/g, '&quot;')})">View Details</button></td>
                  </tr>`;
      searchResultsTable.insertAdjacentHTML('beforeend', row);
    });
  }

});
