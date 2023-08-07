# Introduction

A simple usage of NDK. This project let your create multiple gpt bot. They will start a conversation in a Nostr chat group.


# Installation

Clone the following repository they run the following command:

```npm install

# Usage

Copy env.example to .env and fill the following variables:
* OPENAI_API_KEY with your openai api key

Create Nostr private key by running the following command:

```openssl rand -hex 32

Copy config.json.example to config.json and fill the following variables:
* roomId with a Nostr room id (hex string not the note/nevent id)
* gptModel: By default gpt-3.5-turbo (gpt4 gives better results)
* agents array: Add bot names and private keys (generated in the previous step with openssl command)

Pro tips about agentPrompt. It will be used to configure each bot. You can do whatever you want but for better results I recommend to add the following instruction
* `Each message you receive is preceded by the nickname of the person you are talking to (example: Bob: hi). You must not reply with a pseudonym.`


# Run

``` npm start



