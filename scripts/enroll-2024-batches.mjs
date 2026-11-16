import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://attendance_app:db6769@127.0.0.1:5432/attendance',
});

const DEPARTMENTS = [
  { id: 'dept_be_cse', code: 'BE CSE', name: 'BE Computer Science & Engineering' },
  { id: 'dept_bt_aids', code: 'BT AI&DS', name: 'B.Tech Artificial Intelligence & Data Science' },
  { id: 'dept_be_cyber', code: 'BE CYBER', name: 'BE Cyber Security' },
  { id: 'dept_be_ece', code: 'BE ECE', name: 'BE Electronics & Communication Engineering' },
  { id: 'dept_be_bme', code: 'BE BME', name: 'BE Biomedical Engineering' },
];

const BATCHES = [
  { id: 'batch_foe_2024_1', name: 'FOE 2024 batch 1', code: 'FOE_2024_BATCH_1', description: 'Faculty of Engineering 2024 Batch 1' },
  { id: 'batch_foe_2024_2', name: 'FOE 2024 batch 2', code: 'FOE_2024_BATCH_2', description: 'Faculty of Engineering 2024 Batch 2' },
  { id: 'batch_foe_2024_3', name: 'FOE 2024 batch 3', code: 'FOE_2024_BATCH_3', description: 'Faculty of Engineering 2024 Batch 3' },
  { id: 'batch_foe_2024_4', name: 'FOE 2024 batch 4', code: 'FOE_2024_BATCH_4', description: 'Faculty of Engineering 2024 Batch 4' },
];

const STUDENTS = [
  {
    "roll": "24BECSE004",
    "name": "ABIRAMI B",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE022",
    "name": "BALA MATHUMITHA L",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE031",
    "name": "DHIVAKAR T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE033",
    "name": "DIVAKAR M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE037",
    "name": "ERIC SAMUEL S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE040",
    "name": "GIRIDHARAN E",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE044",
    "name": "GOKULNATHAN S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE045",
    "name": "GOKULRAJ A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE064",
    "name": "HASWIN S K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE076",
    "name": "JEEVA VASANTH A S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE082",
    "name": "KALAIARASI S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE084",
    "name": "KANISHK M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE096",
    "name": "KISHORE G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE112",
    "name": "MITHRASREE",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE117",
    "name": "MUTHUKUMARAN BABUJI T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE118",
    "name": "NAMITHA N S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE119",
    "name": "NANDHAKISHORE A G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE121",
    "name": "NITHESH K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE124",
    "name": "NITHISHKUMAR P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE128",
    "name": "PAVITHRAN E",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE130",
    "name": "PON ESAKKI A V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE147",
    "name": "RAKSHANA T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE152",
    "name": "REVANTH R B",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE156",
    "name": "ROHITH P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE166",
    "name": "SANDHANA KRISHNAN C",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE169",
    "name": "SANJAY D",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE178",
    "name": "SARAN B",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE188",
    "name": "SHRRIAM S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE198",
    "name": "SOWMITHA A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE211",
    "name": "SUDHARSHAN N V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE213",
    "name": "SURENDHAR V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE222",
    "name": "TARIKA S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE223",
    "name": "TARUN DHARSAN R J",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE225",
    "name": "S Tharanitharan",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE227",
    "name": "THARUN KUMAR S S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE239",
    "name": "Vinish S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE243",
    "name": "VISHNU PRASAD S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE246",
    "name": "VISHNUVEL C P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE249",
    "name": "YUVANESAN G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY008",
    "name": "BHARATH G",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY022",
    "name": "S KISHORE",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY024",
    "name": "LETHEESKUMAR V",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY029",
    "name": "NAVEENKUMAR K",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY037",
    "name": "PRAVEEN T",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY038",
    "name": "PRIYADHARSHINI S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY040",
    "name": "RAGURAM S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY054",
    "name": "SUDEEP R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY059",
    "name": "VELSANKAR S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECY063",
    "name": "YUVARAJ R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BEECE017",
    "name": "K S AZWIN",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BEECE121",
    "name": "POOJAG",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD005",
    "name": "AISHWARYA M",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD013",
    "name": "DEEPAK U K",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD014",
    "name": "DHANESH KUMAR R",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD017",
    "name": "GHIRTHANA V",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD018",
    "name": "HARIHARAN S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD023",
    "name": "KOWSHIKAA C",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD033",
    "name": "NIVETHA J",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD044",
    "name": "T SAILESH",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD045",
    "name": "SANTHIVARSHINI D",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BTAD063",
    "name": "TAMIL VENTHAN A",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "25LBECSE002",
    "name": "KISHORE S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BEBME032",
    "name": "LEO SELVAA B",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE017",
    "name": "ARCHANA A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE032",
    "name": "DHIVYA SRI S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE048",
    "name": "GOWJITH S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE055",
    "name": "HARIHARAPUTHIRAN S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE057",
    "name": "HARIPRABHA R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE058",
    "name": "HARIPRASANTH T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE061",
    "name": "HARISH K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE071",
    "name": "JANAGAN R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE072",
    "name": "JANANI M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE074",
    "name": "JAYASAKTHI G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE089",
    "name": "KARTHICK A R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE092",
    "name": "KAVINYA R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE106",
    "name": "LOGESH ELAVARASAN",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE108",
    "name": "LYDIAH MERCIKA G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE133",
    "name": "PRABAKARAN R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE134",
    "name": "PRAJITH V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE136",
    "name": "PRANESH G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE139",
    "name": "PRASANTH R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE149",
    "name": "RANJITH KUMAR S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE153",
    "name": "RITHISH K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE157",
    "name": "RUBITH KUMAR M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE159",
    "name": "SABARISH S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE161",
    "name": "SACHIN N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE162",
    "name": "SAI MADHUMITHAA V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE163",
    "name": "SAJIT A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE174",
    "name": "SANJITH A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE177",
    "name": "SANTHOSHKUMAR S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE180",
    "name": "SASIDHAR S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE183",
    "name": "SENTHAMIL P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE193",
    "name": "Sneha Priya J",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE194",
    "name": "Soniyagandhi N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE203",
    "name": "SRIDHARSHANYA S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE204",
    "name": "Srinivasan S R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE208",
    "name": "SRIVISHAHAN D",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE210",
    "name": "V SUDHARSAN",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE215",
    "name": "SURYA S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE217",
    "name": "R suthish kumar",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE218",
    "name": "SUWATHISREE",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE219",
    "name": "Swetha R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE221",
    "name": "TANUJA R S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE233",
    "name": "VENKATESAN K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY002",
    "name": "AKSHAY S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY003",
    "name": "ANBARASU S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY004",
    "name": "ARCHANA TV",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY007",
    "name": "BARATH M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY011",
    "name": "DHARUNDEEP S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY012",
    "name": "DURAIKANNAN S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY016",
    "name": "HARISHKANTH M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY020",
    "name": "KALI SARAN J",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY032",
    "name": "PRADEEP M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY046",
    "name": "SANJAY M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY053",
    "name": "SUBASAN AN",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY055",
    "name": "SUGANTH S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECY062",
    "name": "YOGANA R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BEECE010",
    "name": "ANU A",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BEECE065",
    "name": "A V JAI NANDANA",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD006",
    "name": "AJAI M",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD016",
    "name": "DHIVYA SHREETHA S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD019",
    "name": "HARISH V",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD029",
    "name": "MUKHESH S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD031",
    "name": "NIKELESHWARAN T",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD032",
    "name": "NIRUBAN KIRTHICK K",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD034",
    "name": "PRANAV S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD035",
    "name": "PRASANNA S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD046",
    "name": "SANTHOSH G",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD055",
    "name": "THANGAVARSHINI B",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD057",
    "name": "VAISHNAVI V",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BTAD058",
    "name": "VASUTHA K",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "25LBTAD001",
    "name": "JAY JEEVAN L",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "25LBTAD002",
    "name": "LAKKSHANA ASHOK",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BEBME001",
    "name": "AARTHI B",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME003",
    "name": "ABINAYA K",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME007",
    "name": "ARUNVARSHAN S K",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME014",
    "name": "DINESH G",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME020",
    "name": "KAMALESH G M",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME022",
    "name": "KARISHMA E",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME025",
    "name": "KAVIDHARSHINI K",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME035",
    "name": "MONIKA V",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME039",
    "name": "NITHYA SREE V",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME042",
    "name": "PRITHIKA SREE S",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME043",
    "name": "PRIYADHARSHIKA N",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME045",
    "name": "RITHANYA M",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME047",
    "name": "SHAHANA LAKSHMI S",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME049",
    "name": "SHEEBA RUBAL C",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME054",
    "name": "SUBHIKSHA B",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEBME061",
    "name": "YOGA DHARSHINI R",
    "deptId": "dept_be_bme",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE002",
    "name": "AADHIT N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE024",
    "name": "BODHENDRA V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE028",
    "name": "DEEPAK M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE029",
    "name": "DHARSHAN K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE030",
    "name": "DHAYALAN P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE043",
    "name": "GOKULARAMAN M K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE046",
    "name": "GOKULRAJ C",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE053",
    "name": "HARIHARAN T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE067",
    "name": "INIYAN S G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE069",
    "name": "JAICHARAN M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE073",
    "name": "JAYAPRAKASH M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE075",
    "name": "JEEVA S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE077",
    "name": "JEEVITHA M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE079",
    "name": "JIFFRIN P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE081",
    "name": "JUGEETHRA B",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE087",
    "name": "KARMUGILAN M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE090",
    "name": "KARTHIKEYAN S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE097",
    "name": "KISHORE K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE099",
    "name": "KOWSHIK V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE111",
    "name": "MIRUDHULA V T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE114",
    "name": "MOHANA PRIYA R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE120",
    "name": "NANTHINI S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE129",
    "name": "PERIYASAMY S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE132",
    "name": "POOVARASAN M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE179",
    "name": "SARAN K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE192",
    "name": "Skandhan N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE197",
    "name": "Sowbarani C S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE212",
    "name": "Suhita K R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE214",
    "name": "Suruthiranjani s",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE216",
    "name": "SUSITHA T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE251",
    "name": "Surendran N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY001",
    "name": "ABISHEK KUMAR S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY009",
    "name": "DHARSHINI S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY010",
    "name": "DHARSHINI V",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY017",
    "name": "INDHU SRI R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY018",
    "name": "INFANT NITHISH M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY027",
    "name": "MYLESH P",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY039",
    "name": "RAGAVARSHINI G",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY041",
    "name": "RANJANI SRI A",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY043",
    "name": "SACHIN S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY044",
    "name": "SANGAMITHRA R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY056",
    "name": "SUVISTHA MARY S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECY064",
    "name": "KEERTHIVASAN M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE007",
    "name": "AISHWARYA LAKSHMI R",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE032",
    "name": "DEEPIKA ESAKKI SANKARI M S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE061",
    "name": "HARINI M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE101",
    "name": "NADASHREE S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE116",
    "name": "NISHANTHINI S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BEECE161",
    "name": "SIVA S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD002",
    "name": "ABIHASHENI S P",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD003",
    "name": "ADEEP MOHAMED P",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD024",
    "name": "MADHUJOTHI R",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD025",
    "name": "MANOJ M",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD028",
    "name": "MUKESH M",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD036",
    "name": "PRATHIKSHA B",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD038",
    "name": "PRIYHAMVADHA S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BTAD059",
    "name": "VISHALINI R",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "25LBTAD003",
    "name": "MANO M",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE135",
    "name": "PRAKASH VEL A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE137",
    "name": "PRANESH P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE138",
    "name": "PRANESHRAJ S N",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE140",
    "name": "PRATHEEP C",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE142",
    "name": "RAGHUL S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE143",
    "name": "RAHUL L",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE148",
    "name": "RAMAN T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE150",
    "name": "RATISH NS",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE154",
    "name": "RITHISH R",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE155",
    "name": "ROHITH M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE181",
    "name": "SATHAIAH M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE191",
    "name": "SIVAGURU S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE195",
    "name": "Soundar A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE199",
    "name": "Sree harini G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE200",
    "name": "SRIBALAJI E",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE201",
    "name": "SRI HARI S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE206",
    "name": "SRISARAN K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE207",
    "name": "P SRIVATHSAVA SARAVNAN",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE209",
    "name": "SUDHAKARAN",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE224",
    "name": "THANGAVELDHARSHAN MUTHU SAMY",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE234",
    "name": "VETRI GANAPATHY MOHAN",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE240",
    "name": "VINOTH B",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE244",
    "name": "VISHNU PRIYA V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE248",
    "name": "Yogeshwaran M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE250",
    "name": "Mari sri A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE252",
    "name": "RATHNESHKUMAR M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY019",
    "name": "JEEVARASU AV",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY026",
    "name": "MALMARUGAN S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY030",
    "name": "NITHISWAR R",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY031",
    "name": "PRABU V",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY033",
    "name": "PRAJIT V",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY034",
    "name": "PRAVEEN G",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY036",
    "name": "PRAVEEN KUMAR S",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY042",
    "name": "SABARI VASAN S B",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY048",
    "name": "SASWANTH B",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECY052",
    "name": "SRINIVASAN M",
    "deptId": "dept_be_cyber",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE002",
    "name": "ABARNEESHWARI S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE008",
    "name": "AISHWARYA M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE012",
    "name": "ANUSRI S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE026",
    "name": "BOOMIKA V",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE037",
    "name": "DHARANI PRAKASH B",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE042",
    "name": "DIVIJA A K",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE050",
    "name": "GOKUL S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE053",
    "name": "GOWSIK M R",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE062",
    "name": "HARISH N",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE066",
    "name": "JANUSHIKA M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE069",
    "name": "JENCIYASINGH J",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE090",
    "name": "MADHIARASU ESWARA A G",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE098",
    "name": "MITUN G",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE100",
    "name": "MOONISH KL",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE104",
    "name": "NAGESHWARAN P",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE124",
    "name": "PRAKASH P",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE128",
    "name": "PRITHIVIRAJ M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE137",
    "name": "RITHIGA P",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE139",
    "name": "RITHIKA S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE146",
    "name": "SAMIKSHA M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE148",
    "name": "SANTHOSE P",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE153",
    "name": "SHAIQ MUHAMMED M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE159",
    "name": "M SHUBA BHARATHI",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE167",
    "name": "SUBASH A",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE168",
    "name": "SUGITHA S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE170",
    "name": "SUSMITHA S",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE172",
    "name": "THABREEJ K",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE179",
    "name": "VIMAL N",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE183",
    "name": "VISHNUPRIYA M",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BEECE189",
    "name": "RUSHAN P R",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BTAD009",
    "name": "ANDRIYA VINIKA A",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BTAD037",
    "name": "PREMNATH J",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BTAD042",
    "name": "RITHVIK S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BTAD043",
    "name": "SAAD S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BTAD061",
    "name": "VIYASH S",
    "deptId": "dept_bt_aids",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBECSE015",
    "name": "DHAYARAM A S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBEECE010",
    "name": "GURU PRASATH R",
    "deptId": "dept_be_ece",
    "batchId": "batch_foe_2024_4"
  }
];

async function main() {
  console.log(`Starting updation for ${STUDENTS.length} students across ${BATCHES.length} batches...`);
  const client = await pool.connect();
  try {
    console.log('Pre-computing bcrypt password hashes...');
    const hashedStudents = [];
    for (let i = 0; i < STUDENTS.length; i++) {
      const s = STUDENTS[i];
      const plainPassword = s.roll.toLowerCase();
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      hashedStudents.push({
        ...s,
        userId: `usr_student_${s.roll.toLowerCase()}`,
        email: `${s.roll.toLowerCase()}@kahedu.edu.in`,
        passwordHash,
      });
      if ((i + 1) % 50 === 0 || i === STUDENTS.length - 1) {
        console.log(`  Hashed ${i + 1}/${STUDENTS.length} student passwords`);
      }
    }

    console.log('Beginning atomic database transaction...');
    await client.query('BEGIN');

    // 1. Insert Departments
    console.log('Inserting/updating 5 engineering departments...');
    for (const d of DEPARTMENTS) {
      await client.query(
        `INSERT INTO departments (id, code, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [d.id, d.code, d.name]
      );
      console.log(`  + Department: [${d.code}] ${d.name}`);
    }

    // 2. Insert Batches
    console.log('Inserting/updating 4 FOE batches...');
    for (const b of BATCHES) {
      await client.query(
        `INSERT INTO batches (id, name, code, allow_cross_department, allow_multiple_years, allowed_years, description)
         VALUES ($1, $2, $3, TRUE, TRUE, ARRAY[1,2,3,4], $4)
         ON CONFLICT (code) DO UPDATE SET 
           name = EXCLUDED.name,
           allow_cross_department = TRUE,
           allow_multiple_years = TRUE,
           allowed_years = ARRAY[1,2,3,4],
           description = EXCLUDED.description`,
        [b.id, b.name, b.code, b.description]
      );
      console.log(`  + Batch: [${b.code}] ${b.name}`);
    }

    // 3. Insert Users
    console.log(`Inserting ${hashedStudents.length} student accounts...`);
    for (const s of hashedStudents) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study)
         VALUES ($1, $2, $3, 'STUDENT', $4, $5, $6, 3)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           enrollment_id = EXCLUDED.enrollment_id,
           department_id = EXCLUDED.department_id,
           year_of_study = 3`,
        [s.userId, s.email, s.passwordHash, s.name, s.roll, s.deptId]
      );
    }
    console.log(`  Successfully inserted/updated ${hashedStudents.length} users in database.`);

    // 4. Insert Batch Members
    console.log('Enrolling students into batch_members...');
    for (const s of hashedStudents) {
      const memberId = `bm_${s.batchId}_${s.userId}`;
      await client.query(
        `INSERT INTO batch_members (id, batch_id, student_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (batch_id, student_id) DO NOTHING`,
        [memberId, s.batchId, s.userId]
      );
    }
    console.log('  Successfully enrolled all students in batch_members.');

    // 5. Verification queries inside transaction
    const deptRes = await client.query("SELECT COUNT(*) FROM departments WHERE code IN ('BE CSE', 'BT AI&DS', 'BE CYBER', 'BE ECE', 'BE BME')");
    const countRes = await client.query(
      `SELECT b.code, COUNT(bm.id) as student_count
       FROM batches b
       LEFT JOIN batch_members bm ON b.id = bm.batch_id
       WHERE b.code LIKE 'FOE_2024_BATCH_%'
       GROUP BY b.code
       ORDER BY b.code`
    );

    console.log('\n--- Verification Inside Transaction ---');
    console.log(`Departments verified: ${deptRes.rows[0].count} / 5`);
    console.log('Batches & Student Roster Counts:');
    let totalEnrolled = 0;
    for (const row of countRes.rows) {
      console.log(`  - ${row.code}: ${row.student_count} students`);
      totalEnrolled += parseInt(row.student_count, 10);
    }
    console.log(`Total Enrolled in FOE Batches: ${totalEnrolled}`);

    if (totalEnrolled !== STUDENTS.length) {
      throw new Error(`Enrollment count mismatch! Expected ${STUDENTS.length}, got ${totalEnrolled}. Rolling back!`);
    }

    await client.query('COMMIT');
    console.log('\n>>> Transaction COMMITTED successfully! All data safely stored. <<<\n');
  } catch (err) {
    console.error('Error during updation, executing ROLLBACK:', err);
    await client.query('ROLLBACK');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
