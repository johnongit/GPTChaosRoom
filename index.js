import { NDKPrivateKeySigner, NDKEvent } from "@nostr-dev-kit/ndk";
import NDK from "@nostr-dev-kit/ndk";
import { createPrompt } from "./utils/openai.js";

// import config
import config from "./config.json" assert { type: "json" };

let relays = ["wss://nos.lol"]
let agents = config.agents
let events = []
let room = config.roomId
let initMessage = config.initMessage


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
    if (events.length == 10) {
        events.shift()
    }
    console.log("event catched", data.pubkey, data.id)

    events.push({
        pubkey: data.pubkey,
        content: data.content,
        id: data.id
    })

    // if pubKey is not in agents then use buildConversation
    let agent = false
    for (let a of agents) {
        let agentSigner = new NDKPrivateKeySigner(a.privKey)
        let agentPubKey = await agentSigner.user().then(async (user) => {
            return user.hexpubkey()
        }) 
        if (agentPubKey == data.pubkey) {
            return true
        }
    }

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
    // if events are not empty
    
    let agentsToKeep = []
    // check if last event refers to an agent
    if (events.length > 0) {
        agentsToKeep = fetchAgent(events[events.length - 1].content)
    }

    // if not, keep remove random agents
    if(agentsToKeep.length == 0) {
        agents.forEach((agent) => {
            agentsToKeep.push(agent)
        })
        agentsToKeep = removeRandomElements(agentsToKeep)
    }

    agentsToKeep.forEach(async (agent,i) => {
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
                        content: initMessage || "Hi"
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

setInterval(async () => await builConversation(), 1000 * 60 * 30 )


function removeRandomElements(arr) {
    // Vérifie que le tableau a au moins un élément
    if (arr.length <= 1) return arr;
    let nbElementsToRemove = Math.floor(Math.random() * arr.length);
    console.log("nbElementsToRemove", nbElementsToRemove)
    for (let i = 0; i < nbElementsToRemove; i++) {
        let indexToRemove = Math.floor(Math.random() * arr.length);
        console.log("indexToRemove", indexToRemove)
        arr.splice(indexToRemove, 1);
    }
    return arr;
  }

function fetchAgent(prompt) {
    let agentsToKeep = []
    agents.forEach((agent) => {
        // split agentName in array of words
        let agentName = agent.agentName.split(" ")
        for (let word of agentName) {
            // if word is in prompt then add agent to agentsToKeep
            if (prompt.toLowerCase().includes(word.toLowerCase())) {
                agentsToKeep.push(agent)
            }
        }
    })
    return agentsToKeep
}