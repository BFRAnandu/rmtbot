//RMTBot V2 by Scinorandex for RobinsMediaTeam

const fs = require('fs');
const Discord = require('discord.js');
const https = require("https");
const ping = require('ping');

const client = new Discord.Client();
const { token } = require('./token.json');

var channel;
var message;

const rawListOfServices = fs.readFileSync('services.json');
const rawListOfIPs = fs.readFileSync('ip.json');
const servicesJSON = JSON.parse(rawListOfServices);
const ipJSON = JSON.parse(rawListOfIPs);

const interval = 15;
const intervalInSeconds = interval*60;
const env = "prod"; //prod or test

var globalWorkingServices = [];
var globalNotWorkingServices = [];
var globalNeutralServices = [];
var globalWorkingIPs = [];
var globalNotWorkingIPs = [];
var globalImportantNames = ["MainAD", "FalloverAD", "CDN", "Backup Server"];
var globalImportantDownNames = [];

var masterUser;
var channelID;

if(env=="prod"){
    channelID="776714951930281994";
    masterUser="194913844190117888";
}else{
    channelID="775252557990723604"
    masterUser="205911447186702336";
}

var globalImportantNames=["MainAD", "FalloverAD", "CDN", "Backup Server"];

function getADate(){
    datetime = new Date();
    da=datetime.getDate();
    mo=datetime.getMonth() + 1;
    ye=datetime.getFullYear();
    hr=datetime.getHours();
    mn=datetime.getMinutes();
    sc=datetime.getSeconds();
  
    hr=hr.toString();
    mn=mn.toString();
    sc=sc.toString();
  
    if(hr.length==1){hr="0"+hr}
    if(mn.length==1){mn="0"+mn}
    if(sc.length==1){sc="0"+sc}
  
    return(`${mo}-${da}-${ye} ${hr}:${mn}:${sc}`);
}

//adds itms in array to message
function createMessageLists(emoji, indicator, arrayToBeChecked){
    if(arrayToBeChecked.length != 0){
    message+="> " + emoji + "**" + indicator + ": **";
    console.log(indicator, arrayToBeChecked);
        for(i = 0; i < arrayToBeChecked.length; i++){
            if (i == arrayToBeChecked.length - 1){
                message+=arrayToBeChecked[i]+"\n"
              }else{
                message+=arrayToBeChecked[i]+", ";
              }
        }
    }
}

function outputToDiscord(){
    actualDate=getADate();
    
    //reset variables
    message="";
    areImportantServicesDown=false;
    pingMasterUser=false;
    globalImportantDownNames=[];

    //set globalImportantDownServices to the intersection of globalImportantServices with notWorkingServices and notWorkingIPs
    importantDownServices = globalImportantNames.filter(value => globalNotWorkingServices.includes(value));
    importantDownIPs = globalImportantNames.filter(value => globalNotWorkingIPs.includes(value));

    //combine importantDownServices and importantDownIPs and send it to globalImportantDownNames
    globalImportantDownNames = importantDownServices.concat(importantDownIPs);
    if (globalImportantDownNames != 0){areImportantServicesDown = true; pingMasterUser = true};

    title="**RMT Service Status check for: "+actualDate+"**\n";
    createMessageLists(":white_check_mark:", "Working Services", globalWorkingServices);
    createMessageLists(":x:", "Broken Services", globalNotWorkingServices);
    createMessageLists(":x:", "Abnormal Services", globalNeutralServices);
    message+="\n"
    createMessageLists(":white_check_mark:", "Alive Machines", globalWorkingIPs);
    createMessageLists(":x:", "Dead Machines", globalNotWorkingIPs);

    if (areImportantServicesDown==true){
        message += "\n"
        message += "> :x:**Important services that have been detected as down: **\n> "
        for(i = 0; i < globalImportantDownNames.length; i++){
            if (i == globalImportantDownNames.length-1){
                message+=globalImportantDownNames[i] + "\n";
            }else{
                message+=globalImportantDownNames[i] + ", ";
            }
        }
    }

    if (globalNotWorkingIPs.length >= 4){
        pingMasterUser=true;
        message+="\n **More than 4 machines have been detected as offline**\n";
    }

    message+="**Done**";

    channel.send(new Discord.MessageEmbed()
        .addField(title,message)
    );
    if(pingMasterUser==true){
	    channel.send("<@"+masterUser+">")
    }
}

function checkIfIPisReachable(name, domain){
    //actual thing that pings machines and makes isAlive true of false
    ping.sys.probe(domain, function(isAlive){
        console.log(domain, isAlive);
        if(isAlive==true){
          globalWorkingIPs.push(name);
        }else if(isAlive==false){
          globalNotWorkingIPs.push(name);
        }
      });
}

function checkIfIPsAreReachable(){
    for (i = 0; i < ipJSON.length; i++){

        name = ipJSON[i].name;
        domain = ipJSON[i].domain;
        checkIfIPisReachable(name, domain);
        
        if(i == ipJSON.length -1){
            setTimeout(outputToDiscord,10*1000)
        }
    }
}

function checkIfServiceIsRunning(name, domain, port){
    //Get http code of domain and pass to if statement to determine which array to push name to
    try{
        https.get({host: domain}, function(res){
            if(res.statusCode == 200 || res.statusCode == 301 || res.statusCode == 302){ //kanboard for some reason reports a code 302
              globalWorkingServices.push(name);
            }
            else if(res.statusCode == 404){
              globalNotWorkingServices.push(name); 
            }else{
              globalNeutralServices.push(name);
              console.log(name, "reported", res.statusCode);
            }
          });
    }catch{
        console.log("An https GET request for " + name + " has timed out.")
    }
}

function checkIfServicesAreRunning(){
    //reset all variables to default
    globalWorkingServices = [];
    globalNotWorkingServices = [];
    globalNeutralServices = [];
    globalWorkingIPs = [];
    globalNotWorkingIPs = [];

    for (i = 0; i < servicesJSON.length; i++){

        //get parameters from JSON
        name = servicesJSON[i].name;
        domain = servicesJSON[i].domain;
        port = servicesJSON[i].port;
        checkIfServiceIsRunning(name, domain, port);

        if(i == servicesJSON.length - 1){
            checkIfIPsAreReachable();
        }
    }
}

client.on('ready', () => {
    channel = client.channels.cache.get(channelID);
    checkIfServicesAreRunning();
    setInterval(checkIfServicesAreRunning, intervalInSeconds*1000);
    
})

client.login(token);
