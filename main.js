//RMTBot V2 by Scinorandex for RobinsMediaTeam

//Load all libraries going to be used
const fs = require('fs');
const Discord = require('discord.js');
const https = require("https");
const ping = require('ping');

//define client and get token
const client = new Discord.Client();
const { token } = require('./token.json');

//create global channel and message variable
var channel;
var message;

//load JSON files
const rawListOfServices = fs.readFileSync('services.json');
const rawListOfIPs = fs.readFileSync('ip.json');
const servicesJSON = JSON.parse(rawListOfServices);
const ipJSON = JSON.parse(rawListOfIPs);

const interval = 15; //define interval in minutes
const intervalInSeconds = interval*60; //define in secods
const env = "test"; //define what type of environment, can either be prod or test

//initialize list variables
var globalWorkingServices = [];
var globalNotWorkingServices = [];
var globalNeutralServices = [];
var globalWorkingIPs = [];
var globalNotWorkingIPs = [];
var globalImportantNames = ["MainAD", "FalloverAD", "CDN", "Backup Server"];
var globalImportantDownNames = [];

//initialize and set environment variables based on env
var masterUser;
var channelID;

if(env=="prod"){
    channelID="776714951930281994";
    masterUser="194913844190117888";
}else{
    channelID="775252557990723604"
    masterUser="205911447186702336";
}

//define list of important services
var importantServices=["MainAD", "FalloverAD", "CDN", "Backup Server"];

//returns a date in a neat format
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
            //ifelse that adds newline if it's the end of the array
            if (i == arrayToBeChecked.length - 1){
                message+=arrayToBeChecked[i]+"\n"
              }else{
                message+=arrayToBeChecked[i]+", ";
              }
        }
    }
}

function outputToDiscord(){
    //resets message variable and get a new date
    actualDate=getADate();
    
    //reset message, areImportantServicesDown, pingMasterUser, and globalImportantDownServices
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

    //begin structuring the message
    title="**RMT Service Status check for: "+actualDate+"**\n";
    createMessageLists(":white_check_mark:", "Working Services", globalWorkingServices);
    createMessageLists(":x:", "Broken Services", globalNotWorkingServices);
    message+="\n"
    createMessageLists(":white_check_mark:", "Alive Machines", globalWorkingIPs);
    createMessageLists(":x:", "Dead Machines", globalNotWorkingIPs);

    //add message if important services have been detected as down
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

    //add message if more than 3 machines down
    if (globalNotWorkingIPs.length >= 4){
        pingMasterUser=true;
        message+="\n **More than 4 machines have been detected as offline**\n";
    }

    message+="**Done**";

    //send message in an embed and ping masterUser if true
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
          globalWorkingIPs.push(name); //push name to globalWorkingIPs
        }else if(isAlive==false){
          globalNotWorkingIPs.push(name); //push name to globalNotWorkingIPs
        }
      });
}

function checkIfIPsAreReachable(){
    for (i = 0; i < ipJSON.length; i++){

        //get parameters from JSON
        name = ipJSON[i].name;
        domain = ipJSON[i].domain;
        checkIfIPisReachable(name, domain);
        
        //call outputToDiscord when for loop has reached the end of the array
        if(i == ipJSON.length -1){
            setTimeout(outputToDiscord,10*1000) //wait for 10 seconds then call outputToDiscord
        }
    }
}

function checkIfServiceIsRunning(name, domain, port){
    //Get http code of domain and pass to if statement to determine which array to push name to
    https.get({host: domain}, function(res){
        if(res.statusCode == 200 || res.statusCode == 301 || res.statusCode == 302){ //kanboard for some reason reports a code 302
          globalWorkingServices.push(name);     //push name to globalWorkingServices
        }
        else if(res.statusCode == 404){
          globalNotWorkingServices.push(name); //push name to globalNotWorkingServices
        }else{
          globalNeutralServices.push(name);   //push name to globalNeutralServices
          console.log(name, "reported", res.statusCode); //log it in console what the error code is
        }
      });
}

function checkIfServicesAreRunning(){
    //reset all arrays to empty
    globalWorkingServices = [];
    globalNotWorkingServices = [];
    globalNeutralServices = [];
    globalWorkingIPs = [];
    globalNotWorkingIPs = [];

    //start looping and calling checkIfServiceIsRunning
    for (i = 0; i < servicesJSON.length; i++){

        //get parameters from JSON
        name = servicesJSON[i].name;
        domain = servicesJSON[i].domain;
        port = servicesJSON[i].port;
        checkIfServiceIsRunning(name, domain, port);

        //call checkIfIPsAreReachable when for loop has reached the end of the array
        if(i == servicesJSON.length - 1){
            checkIfIPsAreReachable();
        }
    }
}

//discord code that starts the timer
client.on('ready', () => {
    channel = client.channels.cache.get(channelID);
    checkIfServicesAreRunning();
    setInterval(checkIfServicesAreRunning, intervalInSeconds*1000);
    
})

//login to discordAPI
client.login(token);