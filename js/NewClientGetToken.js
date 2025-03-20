const platformClient = require("platformClient");

const client = platformClient.ApiClient.instance;

const clientID = "b27b01c2-8ce4-4a9a-a0d6-863e2a1c0207";

client.setEnvironment("mypurecloud.ie");

let sToken = localStorage.getItem("token");

client.setAccessToken(sToken);


//console.log(sToken);
//alert(sToken);