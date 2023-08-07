import { NDKPrivateKeySigner, NDKEvent } from "@nostr-dev-kit/ndk";
import NDK from "@nostr-dev-kit/ndk";
import { createPrompt } from "./utils/openai.js";

// import config
import config from "./config.json" assert { type: "json" };

let relays = ["wss://nos.lol"]
let agents = config.agents
let events = []
let room = config.roomId



const ndk = new NDK({explicitRelayUrls: relays})
let signers = []

await ndk.connect();

let sub = ndk.subscribe(
    {
        "kinds":[42],
        "since": Math.floor(Date.now() / 1000),
        'limit': 0,
        "#e":[room],
    },
    { closeOnEose: false });

sub.on("event", async (data) => {
    console.log("event catched", data.pubkey, data.id)

    events.push({
        pubkey: data.pubkey,
        content: data.content,
        id: data.id
    })
    console.log("agents", agents)
    // if pubKey is not in agents then use buildConversation
    let agent = false
    for (let a of agents) {
        let agentSigner = new NDKPrivateKeySigner(a.privKey)
        let agentPubKey = await agentSigner.user().then(async (user) => {
            return user.hexpubkey()
        }) 
        console.log("in for",agentPubKey, data.pubkey)
        if (agentPubKey == data.pubkey) {
            return true
        }
    }
    console.log("agent", agent)
    if (!agent) {
        console.log("agent not found, build conversation")
        builConversation()
    }
    
    
});

async function createAgent(agent) {
    let privKey = agent.privKey
    let agentSigner = new NDKPrivateKeySigner(privKey)
    let ndkAgent = new NDK({explicitRelayUrls: relays, signer: agentSigner})
    await ndkAgent.connect()
    let ndkAgentEvent = new NDKEvent(ndkAgent, {
        kind:0,
        content: JSON.stringify(agent.profile),
    })
    
    await ndkAgentEvent.sign()
    
    await ndkAgentEvent.publish()
    return ndkAgent
}

agents.forEach(async (agent) => {
    await createAgent(agent)
})


async function signAndPublish42(agent, message) {
    let privKey = agent.privKey
    let agentSigner = new NDKPrivateKeySigner(privKey)
    let ndkAgent = new NDK({explicitRelayUrls: relays, signer: agentSigner})
    agentSigner.user().then(async (user) => {
        console.log("user", user.hexpubkey())
    })
    await ndkAgent.connect()
    let ndkAgentEvent = new NDKEvent(ndkAgent, {
        kind:42,
        content: message,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["e", room]]
    })
    await ndkAgentEvent.sign()
    await ndkAgentEvent.publish()
    return 
}

async function builConversation() {
    agents.forEach(async (agent,i) => {
        await setTimeout(async () => {
            let agentSigner = new NDKPrivateKeySigner(agent.privKey)
            let agentPubKey = await agentSigner.user().then(async (user) => {
                return user.hexpubkey()

                }) 
            // define message to push to OpenAI
            let messages = [{
                role: "system",
                content: agent.agentPrompt
            }]
            //if events are not empty
            if (events.length > 0) {
                for (let event of events) {
                    if (event.pubkey == agentPubKey) {
                        messages.push(
                            {
                                role: "assistant",
                                content: event.content
                            }
                        )
                    }
                    else {
                        const ndk = new NDK({ explicitRelayUrls: relays });
                        await ndk.connect();
                        const user = ndk.getUser({hexpubkey: event.pubkey})
                        await user.fetchProfile()
                        
                        let profile = user.profile
                        let name = profile?.name || "Unknown";
                        messages.push(
                            {
                                role: "user",
                                content: name + ":" + event.content
                            }
                        )
                    }
                }
            }
            else {
                messages.push(
                    {
                        role: "assistant",
                        content: "Salut, Comment ça va ?"
                    }
                )
            }
            console.log('---message to send on openai for ', agent.agentName, '\n', messages)
            let message = await createPrompt(messages)
            
            message = message.data.choices[0].message.content
            console.log('---message computed by openai for ', agent.agentName, '\n', message)
            
            await signAndPublish42(agent, message)
            return
        }, i*1000*5)
    })
}

setInterval(async () => builConversation, 1000 * 60 * 30 )



/*
setTimeout(async () => {
    console.log((config.agent[0].privKey))
    let agentSigner = new NDKPrivateKeySigner(config.agent[0].privKey)
    agentSigner.user().then(async (user) => {
        console.log("user", user)
    })
    let ndkAgent = new NDK({explicitRelayUrls: relays, signer: agentSigner})
    await ndkAgent.connect()
    let ndkAgentEvent = new NDKEvent(ndkAgent, {
        kind:42,
        content: "Hello World",
        tags: [["e", "36aa5e222bcb7f0e45347fae084c3f36f1b8702c5c7f70becd214de6166b9861"]]

    })
    
    await ndkAgentEvent.sign()
    console.log(ndkAgentEvent)
    await ndkAgentEvent.publish()
},5000)
*/

