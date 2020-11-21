const fs = require('fs');
const Discord = require('discord.js');
var https = require("https");
var ping = require('ping');

const client = new Discord.Client();
const { token } = require('./token.json');

var rawListOfServices = fs.readFileSync('services.json');
var servicesJSON = JSON.parse(rawListOfServices);
var rawListOfIPs = fs.readFileSync('ip.json');
var ipJSON = JSON.parse(rawListOfIPs);

var globalImportantServices=["MainAD", "FalloverAD", "CDN", "Backup Server"];
var globalImportantDownServices=[];

var message="";
var globalWorkingServices=[];
var globalNotWorkingServices=[];
var globalNeutralServices=[];
var globalRespondingIPs=[];
var globalNotRespondingIPs=[];

var interval=15;

var channelID="776714951930281994"; //production
//var channelID="775252557990723604"; //testing
var masterUser="194913844190117888"; //production
//var masterUser="205911447186702336"; //testing
var channel;

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

function outputToDiscord(){
  message="";
  actualDate=getADate();
  pingMasterUser=false;
  importantDownServices=[];
  console.log("Doing log for "+actualDate)
  title="**RMT Service Status check for: "+actualDate+"**\n";

  if(workingServices.length!=0){
    message+="> :white_check_mark:**Working Services: **"
    for (i = 0; i < workingServices.length; i++){
      if (i==workingServices.length-1){
        message+=workingServices[i]+"\n"
      }else{
        message+=workingServices[i]+", ";
      }
    }
  }
  
  if(notWorkingServices.length!=0){
    message+="> :x:**Broken Services: **"
    for (i = 0; i < notWorkingServices.length; i++){
      if (i==notWorkingServices.length-1){
        message+=notWorkingServices[i]+"\n"
      }else{
        message+=notWorkingServices[i]+", ";
      }
    }
  }

  if(neutralServices.length!=0){
    message+="> :neutral:**Abnormal Services: **"
    for (i = 0; i < neutralServices.length; i++){
      if (i==neutralServices.length-1){
        message+=neutralServices[i]+"\n"
      }else{
        message+=neutralServices[i]+", ";
      }
    }
  }
  
  message+="\n"
  
  if(globalRespondingIPs!=0){
    message+="> :white_check_mark:**Alive Machines: **"
    for (i = 0; i < globalRespondingIPs.length; i++){
      if (i==globalRespondingIPs.length-1){
        message+=globalRespondingIPs[i]+"\n"
      }else{
        message+=globalRespondingIPs[i]+", ";
      }
    }
  }

  if(globalNotRespondingIPs!=0){
	  console.log(globalNotRespondingIPs);
    message+="> :x:**Dead Machines: **"
    for (i = 0; i < globalNotRespondingIPs.length; i++){
      if (i==globalNotRespondingIPs.length-1){
        message+=globalNotRespondingIPs[i]+"\n";
      }else{
        message+=globalNotRespondingIPs[i]+", ";
      }
    }
  }
  for(i=0;i<notWorkingServices.length;i++){
	for(k=0;k<globalImportantServices.length;k++){
		if(notWorkingServices[i]==globalImportantServices[k]){
			importantDownServices.push(globalImportantServices[k]);
			pingMasterUser=true;
		}
	}
  }
  for(i=0;i<globalNotRespondingIPs.length;i++){
	for(k=0;k<globalImportantServices.length;k++){
		if(globalNotRespondingIPs[i]==globalImportantServices[k]){
			importantDownServices.push(globalImportantServices[k]);
			pingMasterUser=true;
		}
	}
  }
  if(pingMasterUser==true){
  	message+="\n";
	message+="> :x:**Important services that have been detected as down: **";
	for(i=0;i<importantDownServices.length;i++){
		if (i==importantDownServices.length-1){
			message+=importantDownServices[i]+"\n";
		}else{
			message+=importantDownServices[i]+", ";
		}
	}
  }
 
message+="**Done**";
  
channel.send(new Discord.MessageEmbed()
        .addField(title,message));
if(pingMasterUser==true){
	channel.send("<@"+masterUser+">")
}
}

function checkIfIPisReachable(name,domain){
  ResponingIPs=[];
  notResponingIPs=[];

  ping.sys.probe(domain, function(isAlive){
    var isItUp = isAlive;
	console.log(domain, isAlive);
    if(isItUp==true){
      ResponingIPs.push(name)
      globalRespondingIPs=ResponingIPs;
    }else if(isItUp==false){
      notResponingIPs.push(name)
      globalNotRespondingIPs=notResponingIPs;
    }
  });

}

function checkIfIPsAreReachable(){
  for (i = 0; i < ipJSON.length; i++) {
    name=ipJSON[i].name;
    domain=ipJSON[i].domain;
    checkIfIPisReachable(name,domain);
    if(i==ipJSON.length-1){
     	console.log("Done doing checkIfIPsAreReachable")
	setTimeout(outputToDiscord,5*1000);
    }
}
}

function checkIfServiceIsRunning(name,domain,port){
  workingServices=[];
  notWorkingServices=[];
  neutralServices=[];

  https.get({host: domain}, function(res){
    if(res.statusCode==200||res.statusCode==301||res.statusCode==302){
      workingServices.push(name)
      globalWorkingServices=workingServices;
    }
    else if(res.statusCode == 404){
      notWorkingServices.push(name);
      globalNotWorkingServices=notWorkingServices;
    }else{
      neutralServices.push(name);
      globalNeutralServices=neutralServices;
      console.log(name, "reported", res.statusCode)
    }
  });
}

function checkIfServicesAreRunning(){
  for (i = 0; i < servicesJSON.length; i++) {
      name=servicesJSON[i].name;
      domain=servicesJSON[i].domain;
      port=servicesJSON[i].port;
      checkIfServiceIsRunning(name,domain,port);
      if(i==servicesJSON.length-1){
        checkIfIPsAreReachable();
      }
  }
}

client.on('ready', () => {
    const localChannel = client.channels.cache.get(channelID);
    channel=localChannel
    checkIfServicesAreRunning();
    setInterval(checkIfServicesAreRunning, interval*60*1000);
    
})
client.login(token);
