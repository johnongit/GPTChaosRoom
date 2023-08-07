import { NDKPrivateKeySigner, NDKEvent } from "@nostr-dev-kit/ndk";
import NDK from "@nostr-dev-kit/ndk";

const ndk = new NDK({ explicitRelayUrls: ["wss://nostr.inosta.cc"] });

await ndk.connect();


let hex = "460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c"
let npub = "npub1r34nhc6nqswancymk452f2frgn3ypvu77h4njr67n6ppyuls4ehs44gv0h"
const john = ndk.getUser({hexpubkey: hex})
console.log(john)
console.log("----------------")
await john.fetchProfile()
console.log(john.profile)

