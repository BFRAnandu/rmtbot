// RMTBot v3 by Scinorandeex
// For use with the RobinsMediaTeam Network
// https://scin.robinsmediateam.dev

// Load all necessary libraries in
const fs = require('fs');
const Discord = require('discord.js');
const https = require("https");
const ping = require('ping');
const sqlite3 = require('sqlite3');

// Login to Discord
const client = new Discord.Client();
const { token } = require('./token.json');

if(process.env.PROD == "true"){
    var channelID="776714951930281994";
    var masterUser=["194913844190117888", "208473993374597120"];
    console.log("Running in Production Mode");
}else{
    var channelID="796677956046159872";
    var masterUser=["205911447186702336"];
    console.log("Running in Testing Mode");
}

// Load main JSON file
const mainJSON = JSON.parse(fs.readFileSync('./main.json'));
const vmlist=mainJSON.vms;
const sitelist=mainJSON.websites;

// Other variables
const interval = 15;

function getADate(){
    let datetime = new Date();
    let da=datetime.getDate();
    let mo=datetime.getMonth() + 1;
    let ye=datetime.getFullYear();
    let hr=datetime.getHours().toString();
    let mn=datetime.getMinutes().toString();
    let sc=datetime.getSeconds().toString();
  
    if(hr.length==1){hr="0"+hr}
    if(mn.length==1){mn="0"+mn}
    if(sc.length==1){sc="0"+sc}
  
    return(`${mo}-${da}-${ye} ${hr}:${mn}:${sc}`);
}

function createLists(emoji, name, array){
    let str="";
    if(array.length != 0){
        str+="" + emoji + "**" + name + ":** ";
        for(i = 0; i < array.length; i++){
            if (i == array.length - 1){
                str+=array[i]+"\n";
            }else{
                str+=array[i]+", ";
            }
        }
    }
    return(str);
}

function getCode(domain){
    var promise = new Promise(function(resolve) {
        var req = https.get({host: domain}, function(res){
            if(res.statusCode == 200 || res.statusCode == 301 || res.statusCode == 302){ //kanboard for some reason reports a code 302
                resolve("good");
            }
            else if(res.statusCode == 404){
                resolve("bad");
            }else{
                resolve("abnormal");
            }
        });
        req.on('error', function(err){
            resolve("error");
        });
        req.end();
    });
    return promise;
}

function pingMachine(domain){
    var promise = new Promise(function(resolve) {
        ping.sys.probe(domain, function(isAlive){
            if(isAlive==true){
                resolve("good");
            }else{
                resolve("bad");
            }
        });
    });
    return promise;
}

async function main(){
    let date = getADate();
    let title="**RMT Service Status check for: " + date + "**\n";
    let message = "";
    let pingMaster = false;
    let goodVMs = [];
    let badVMs = [];
    let goodSites = [];
    let weirdSites = [];
    let badSites = [];

    for(i = 0; i < vmlist.length; i++){
        workingVM=vmlist[i];
        status = await pingMachine(workingVM.domain);
        if(status == "good"){goodVMs.push(workingVM.name)}
        else(badVMs.push(workingVM.name))
    }

    for(o = 0; o < sitelist.length; o++){
        workingSite=sitelist[o];
        status = await getCode(workingSite.domain);
        if(status == "good"){goodSites.push(workingSite.name)}
        else if(status == "abnormal"){weirdSites.push(workingSite.name)}
        else if(status == "bad"){badSites.push(workingSite.name)}
    }

    if(badVMs.length > 0 || badSites.length > 0 || weirdSites.length > 0){
        pingMaster = true;
    }

    message+= createLists(":white_check_mark:", "Working Sites", goodSites);
    message+= createLists(":x:", "Broken Sites", badSites);
    message+= createLists(":x:", "Abnormal Sites", weirdSites);
    message+="\n";
    message+= createLists(":white_check_mark:", "Alive Machines", goodVMs);
    message+= createLists(":x:", "Dead Machines", badVMs);
    message+="**Done**"

    channel.send(new Discord.MessageEmbed()
        .addField(title, message)
    );

    if(pingMaster==true){
        for(i = 0; i < masterUser.length; i++){
            channel.send("<@"+masterUser[i]+">");
        }
    }
    // Add rows to database
    let options = [date, goodVMs.join(', '), badVMs.join(', '), goodSites.join(', '), weirdSites.join(', '), badSites.join(', ')];
    var promise = new Promise(function(resolve, reject) {
        db.run(`INSERT INTO bot(date, goodVMs, badVMs, goodSites, weirdSites, badSites) VALUES(?,?,?,?,?,?)`, options , function(err) {
            if(err) {
                console.log(err.message);
                resolve(false);
            }else{
                console.log(`A row has been inserted with rowid ${this.lastID}`);
                resolve(true);
            }
        });
    });
    return promise;
}

client.on('ready', async () => {
    channel = await client.channels.cache.get(channelID);
    main();
    setInterval(main, interval*60*1000);
})

client.login(token);

//sqlite
let db = new sqlite3.Database(`./bot.db`, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Connected to database`);
});

db.serialize(function() {
    db.run("PRAGMA cipher_compatibility = 4");
    db.run('CREATE TABLE IF NOT EXISTS bot(date text, goodVMs text, badVMs text, goodSites text, weirdSites text, badSites text)');
});