setInterval(() => {
    UpdateMemberDBJson();
    UpdateKanjiDBJson();
}, 15 * 60 * 1000);

const Discord = require('discord.js');
const fetch = require('node-fetch');
const { prefix, token, rapidkey } = require('./config.json');
const client = new Discord.Client();
const { spawn } = require('child_process')
const { execFile } = require('child_process')

const fs = require("fs");
const { setTimeout } = require('timers');
let kanjiDB;
let memberDB;
let factorioServer;
let factorioChannel;
let factorioStarted = false;
class Kanji {
    constructor(kanji) {
        this.kanji = kanji;
    }
}

client.once('ready', () => {
    console.log('Ready!');
    kanjiDB = JSON.parse(fs.readFileSync("./kanjiDB.json", { encoding: "utf8" }));
    memberDB = JSON.parse(fs.readFileSync("./memberDB.json", { encoding: "utf8" }));
})

client.on('message', message => {
    if (message.author == client.user)
        return;
    if (message.content == "bot kardeşliği")
        setTimeout(() => {
            message.channel.send("<@750480438786654310> gel la <:peepoHug:795062981426806805>");
        }, 1000);

    if (message.content.startsWith(prefix)) {
        let msg = message.content;
        let args = msg.split(" ");
        args.shift();
        if (args.length == 0 || args[0] == "help") {
            const helpEmbed = new Discord.MessageEmbed().setTitle("Commands").setColor('#0099ff')
                .addFields({ name: "search", value: "!k [b/f/l/none]search <kanji/word>", inline: false }, { name: "add", value: "!k add <kanji> [reading] [meaning]", inline: false })
                .addFields({ name: "remove", value: "!k remove <kanji>", inline: false })
                .setThumbnail("https://pbs.twimg.com/profile_images/378800000741890744/43702f3379bdb7d0d725b70ae9a5bd59_400x400.png");
            message.channel.send(helpEmbed);
            return;
        }
        if (args[0] == "ado") {
            message.channel.send("<:peepoHug:795062981426806805> <@223176950766764044>");
            return;
        }
        if (args[0] == "atom") {
            message.channel.send("<:peepoHug:795062981426806805> <@267164902290882570>");
            return;
        }

        if (args[0] == "resetHard") {
            kanjiDB = {
                "users": {

                },
                "kanjis": {

                }
            }
            memberDB = {

            }
            UpdateKanjiDBJson();
            UpdateMemberDBJson();
        }

        if (args[0] == "list") {
            args.shift();
            let mention = message.mentions.users.first();
            let selectedUser;
            if (!mention) {
                selectedUser = message.author;
            } else {
                selectedUser = mention;
            }
            let user = getUserKanjiDB(selectedUser.id)
            message.channel.send("``" + selectedUser.username + "`` 's kanji list contains ``" + user['kanjis'].length + "`` kanji.");
            DisplayList(user, message.channel);
            return;
        }

        if (args[0] == "lsearch") {
            args.shift();
            if (args.length == 0) {
                message.channel.send("!k lsearch <kanji>");
                return;
            }
            let kanji = args[0];
            let foundKanji = kanjiDB["kanjis"][kanji];
            if (foundKanji == undefined) {
                message.channel.send("yok ki olm mal mısın");
                return;
            }
            message.channel.send(generateEmbedFromJson(kanji, foundKanji, false));
            return;
        }

        if (args[0] == "bsearch") {
            args.shift();
            if (args.length == 0) {
                message.channel.send("!k bsearch <kanji>");
                return;
            }
            basicDisplayKanji(args[0], message.channel);
            message.delete();
            return;
        }

        if (args[0] == "search") {
            args.shift();

            let amount = 1;
            if (args.length >= 2 && !isNaN(args[0])) {
                amount = args[0];
                args.shift();
            }
            if (args.length == 0) {
                message.channel.send("!k search [display amount] <kanji>");
                return;
            }
            let toSearch = args[0];
            args.shift();
            args.forEach(arg => {
                toSearch += " " + arg;
            });
            console.log(toSearch);
            displayKanji(toSearch, amount, message.channel, false);
            return;
        }

        if (args[0] == "fsearch") {
            args.shift();

            let amount = 1;
            if (args.length >= 2 && !isNaN(args[0])) {
                amount = args[0];
                args.shift();
            }
            if (args.length == 0) {
                message.channel.send("!k fsearch [display amount] <kanji>");
                return;
            }
            let toSearch = args[0];
            args.shift();
            args.forEach(arg => {
                toSearch += " " + arg;
            });
            displayKanji(toSearch, amount, message.channel, false);
            return;
        }

        if (args[0] == "add") {
            args.shift();
            if (args.length == 0) {
                message.channel.send("!k add <kanji>");
                return;
            }
            let kanji = args[0];
            tryAddKanjiToUser(kanji, message.channel, message.author.id);
            return;
        }

        if (args[0] == "remove") {
            args.shift();
            if (args.length == 0) {
                message.channel.send("!k remove <kanji>");
                return;
            }
            let kanji = args[0];
            let user = getUserKanjiDB(message.author.id);
            if (!user['kanjis'].includes(kanji)) {
                message.channel.send("Senin listede bu yok nereye kaldırıyon <:peepoGiggle:724583310734655520>");
                return;
            }
            user['kanjis'].splice(user['kanjis'].indexOf(kanji), 1);
            message.channel.send("Removed kanji ``" + kanji + "`` from your kanji list. ``" + user['kanjis'].length + "`` kanjis are in your list.");
            UpdateMemberDBJson();
            return;
        }

        if (args[0] == "random") {
            args.shift();
            if (args.length != 0 && isNaN(args[0])) {
                message.channel.send("!k random [amount]");
                return;
            }
            let user = getUserKanjiDB(message.author.id);
            let amount = 5;
            if (args.length >= 1) {
                amount = args[0];
            }
            let indexes = [];
            for (let i = 0; i < user['kanjis'].length; i++) {
                indexes.push(i);
            }
            amount = indexes.length < amount ? indexes.length : amount;
            let chosen = [];
            for (let i = 0; i < amount; i++) {
                chosen.push(indexes.splice(Math.floor(Math.random() * indexes.length), 1));
            }
            let chosenKanjis = chosen.map(i => user['kanjis'][i]);
            chosenKanjis.forEach(ck => {
                displayKanjiFromList(ck, message.channel, user);
            });
            return;
        }
        if (args[0] == "factorio-start") {
            if (factorioServer == null) {

                factorioChannel = message.channel;
                factorioServer = spawn("/bin/sh");
                setTimeout(() => {
                    factorioServer.stdin.write("echo slm\n");
                }, 1000);
                factorioServer.stdout.on("data", (data) => {

                    if (!factorioStarted) {
                        factorioStarted = true;
                        factorioServer.stdin.write("/opt/factorio/start.sh\n");
                        factorioChannel.send(`Açıldım`);
                        console.log(`Açıldım ` + data);
                    }
                });

                factorioServer.on('exit', (code, signal) => {
                    factorioChannel.send(`Kapandım`);
                    console.log(`Kapandım`);
                    factorioServer = null;
                    factorioStarted = false;
                    spawn("/opt/factorio/stop.sh");
                });
            } else {
                message.channel.send("Zaten açık brom");
            }
            return;
        }
        if (args[0] == "factorio-stop") {
            if (factorioServer != null) {
                factorioServer.kill('SIGINT');
            } else {
                message.channel.send("Kapalı ki");
            }
            return;
        }
        if (args[0] == "factorio-reset") {
            factorioServer.kill('SIGINT');
            return;
        }
    }
});

async function displayKanji(kanji, amount, channel, fullSearch) {
    let jishoJson = await jsonFromJisho(kanji);
    let displayedAmount = 0;
    let firstKanji = undefined;
    jishoJson['data'].forEach(dataJson => {
        if (dataJson['japanese'] == undefined)
            return;
        let kanjiFromJson = dataJson['japanese'][0]['word'];
        if (firstKanji == undefined)
            firstKanji = kanjiFromJson;

        if (!(isSame(kanji, dataJson) || displayedAmount == 0) || displayedAmount >= amount) {
            return;
        }

        let searchEmbed = generateEmbedFromJson(kanji, dataJson, !fullSearch);
        channel.send(searchEmbed);
        displayedAmount++;

    });
    if (firstKanji != undefined && fullSearch) {
        let kaliveJson = await jsonFromKanjiAlive(firstKanji.charAt(0));
        if (kaliveJson['kanji'] != undefined) {
            await channel.send("", { files: [kaliveJson['kanji']['video']['mp4']] });
        }
        if (kaliveJson['examples'] != undefined) {
            kaliveJson['examples'].forEach(example => {
                if (example['japanese'].startsWith(firstKanji + "（") || example['japanese'].startsWith("*" + firstKanji + "（")) {
                    channel.send("Reading of " + example['japanese'].replace("*", ""), { files: [example['audio']['mp3']] });
                }
            });
        }
    }
    if (displayedAmount == 0) {
        channel.send("yok ki olm mal mısın");
    }
}

async function basicDisplayKanji(kanji, channel) {
    let jishoJson = await jsonFromJisho(kanji);
    if (jishoJson['data'] != undefined && jishoJson['data'].length > 0 && jishoJson['data'][0]['japanese'] != undefined) {
        channel.send(jishoJson['data'][0]['japanese'][0]['word'] +
            " ||" + jishoJson['data'][0]['japanese'][0]['reading'] + "|| " +
            "||" + jishoJson['data'][0]['senses'][0]['english_definitions'][0] + "||");
    } else {
        channel.send("yok ki olm mal mısın");
    }
}

function DisplayList(user, channel) {
    let messages = [];
    messages.push("");
    let lastindex = 0;
    if (user['kanjis'].length == 0)
        return;
    user["kanjis"].forEach(kanji => {
        if (messages[lastindex].length >= 1800) {
            messages[lastindex] = messages[lastindex].substr(0, messages[lastindex].length - 2);
            lastindex++;
            messages.push("");
        }
        let chosenStr = messages[lastindex];
        chosenStr += kanji + ", ";
        messages[lastindex] = chosenStr;
    })
    messages[lastindex] = messages[lastindex].substr(0, messages[lastindex].length - 2);
    messages.forEach(msg => channel.send(msg));
    return;
}

function isSame(search, json) {
    if (json['japanese'] == undefined)
        return false;
    let kanjiFromJson = json['japanese'][0]['word'];
    let readings = [];
    json['japanese'].forEach(jpn => {
        if (jpn['word'] == kanjiFromJson)
            readings.push(jpn['reading']);
    });
    return search == kanjiFromJson || readings.includes(search);
}

function generateEmbedFromJson(search, json, hide) {
    let kanjiFromJson = json['japanese'][0]['word'];
    let readings = [];
    json['japanese'].forEach(jpn => {
        if (jpn['word'] == kanjiFromJson)
            readings.push(jpn['reading']);
    });
    let readingStr = "";
    readings.forEach(reading => {
        readingStr += reading + ", "
    })
    readingStr = readingStr.substr(0, readingStr.length - 2);
    let jlpt = json['jlpt'][0];
    let meanings = json['senses'];
    let meaningStrs = "";
    if (meanings != undefined) {
        meanings.forEach(meaning => {
            if (meaningStrs.length > 900)
                return;
            meaning['english_definitions'].forEach(definition => {
                meaningStrs += definition + ", ";
            })
            meaningStrs = meaningStrs.substr(0, meaningStrs.length - 2);
            meaningStrs += "\n\n";
        });
    }
    let searchEmbed = new Discord.MessageEmbed().setTitle(search).setURL(encodeURI("https://www.jisho.org/search/" + search))
        .setThumbnail("https://pbs.twimg.com/profile_images/378800000741890744/43702f3379bdb7d0d725b70ae9a5bd59_400x400.png")
        .setColor('#0099ff');
    if (kanjiFromJson != undefined)
        searchEmbed.addField("Kanji", kanjiFromJson, false);
    if (readings != undefined) {
        if (hide) {
            readingStr = "||" + readingStr + "||";
        }
        searchEmbed.addField("Reading", "**" + readingStr + "**", true)
    }
    if (meanings != undefined) {
        if (hide)
            meaningStrs = "||" + meaningStrs + "||";
        searchEmbed.addField("Meaning", "**" + meaningStrs + "**", false);
    }
    if (jlpt != undefined)
        searchEmbed.setDescription("JLPT Level: **" + jlpt.replace("jlpt-", "").toUpperCase() + "**");
    return searchEmbed;
}

function findKanji(kanji) {
    return kanjiDB['kanjis'][kanji];
}

function jsonFromJisho(kanji) {
    console.log(kanji);
    return new Promise(resolve => {
        let url = encodeURI("https://jisho.org/api/v1/search/words?keyword=" + kanji);
        let options = { method: "Get" };
        fetch(url, options)
            .then(res => res.json()).then(json => resolve(json));
    });
}

function jsonFromKanjiAlive(kanji) {
    return new Promise(resolve => {
        let url = encodeURI("https://kanjialive-api.p.rapidapi.com/api/public/kanji/" + kanji + "?rapidapi-key=" + rapidkey);
        let options = { method: "Get" };
        fetch(url, options)
            .then(res => res.json()).then(json => resolve(json));
    });
}

async function tryAddKanjiToUser(kanji, channel, userID) {
    let user = getUserKanjiDB(userID);
    if (user['kanjis'].includes(kanji)) {
        channel.send("Ztn var olm napıyon");
        return;
    }
    if (kanjiDB['kanjis'][kanji] == undefined) {
        if (!await addKanjiToList(kanji)) {
            channel.send("yok ki olm mal mısın");
            return;
        }
    }
    let foundEmbed = generateEmbedFromJson(kanji, kanjiDB['kanjis'][kanji], false);
    user['kanjis'].push(kanji);
    channel.send("Found kanji:");
    channel.send(foundEmbed);
    channel.send("Added kanji ``" + kanji + "`` to kanji list of <@" + userID + ">, which contains ``" + user['kanjis'].length + "`` kanji.");
    UpdateMemberDBJson();
}

async function addKanjiToList(kanji) {
    let jishoJson = await jsonFromJisho(kanji);
    return new Promise(resolve => {
        let data = jishoJson['data'];
        let foundData = findFirstMatch(kanji, data);
        if (foundData == undefined) {
            resolve(false);
            return;
        }
        kanjiDB["kanjis"][kanji] = foundData;
        UpdateKanjiDBJson();
        console.log("Added kanji " + kanji + " to the list.");
        resolve(true);
    });
}

async function displayKanjiFromList(kanji, channel, user) {
    let json = await getKanjiFromList(kanji);
    if (json == null) {
        channel.send("Couldn't find kanji ``" + kanji + "``.");
        user['kanjis'].splice(user.indexOf(kanji), 1);
        UpdateMemberDBJson();
        return;
    }
    channel.send(generateEmbedFromJson(kanji, json, true));
}

async function getKanjiFromList(kanji) {
    if (kanjiDB['kanjis'][kanji] != undefined) {
        return kanjiDB['kanjis'][kanji];
    }
    let found = await addKanjiToList(kanji);
    if (found) {
        if (kanjiDB['kanjis'][kanji] != undefined) {
            return kanjiDB['kanjis'][kanji];
        }
    }
    return null;
}

function getUserKanjiDB(userID) {
    if (memberDB[userID] == undefined) {
        memberDB[userID] = {
            "kanjis": []
        }
    }
    return memberDB[userID];
}

function findFirstMatch(kanji, datasJson) {
    if (datasJson == undefined) {
        return undefined;
    }
    let foundData = undefined;
    datasJson.forEach(dt => {
        if (foundData != undefined)
            return;
        if (dt['slug'] == kanji)
            foundData = dt;
        else {
            dt['japanese'].forEach(jpn => {
                if (jpn['word'] == kanji)
                    foundData = dt;
            })
        }
    });
    return foundData;
}

function UpdateKanjiDBJson() {
    fs.writeFileSync("./kanjiDB.json", JSON.stringify(kanjiDB, null, 4));
    console.log("kanjiDB json updated");
}

function UpdateMemberDBJson() {
    fs.writeFileSync("./memberDB.json", JSON.stringify(memberDB, null, 4));
    console.log("memberDB json updated");
}



client.login(token);