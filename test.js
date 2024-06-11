const qrcode = require('qrcode-terminal');
const { Client, LegacySessionAuth, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const { OpenAI} = require("openai");
const fs = require("fs")
require("dotenv").config()
const openai = new OpenAI({
    apiKey: process.env.openai // openai api key
});
const client = new Client({
     authStrategy: new LocalAuth({
          clientId: "client-one" 
     })
})

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
    console.log(session);
});

client.initialize();
client.on("qr", qr => {
    qrcode.generate(qr, {small: true} );
})

client.on('ready', () => {
    console.log("ready to message")
});


async function GetResponse(FileName){
    const transcript = await openai.audio.transcriptions.create(
        {
            file: fs.ReadStream(`./${FileName}.ogg`),
            model:'whisper-1',
        }
    );
    console.log(transcript.text)
    const response = await openai.chat.completions.create(
        {
            model:"gpt-3.5-turbo-16k-0613",
            messages:[{"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": transcript.text},
            ]
        }
    );
    const responses = response.choices[0].message.content;
    console.log(responses)
    return responses
}

function man(){
    client.on('message', async (message) => { 
        if (message.type == "ptt"){
            console.log((await message.getContact()).name)
            const FileName = (await message.getContact()).name
            const audio = await (await message.downloadMedia()).data
            fs.writeFile(`${FileName}.ogg`,Buffer.from(audio,'base64'), {encoding: 'base64'}, async (err) =>{
                if (err){
                    console.log("error: ",err)
                }
                else{
                    console.log("success to download voice message")
                    const response = await GetResponse(FileName)
                    await client.sendMessage(message.from, response)
                }
            })
            
        }
    });
}

man();
