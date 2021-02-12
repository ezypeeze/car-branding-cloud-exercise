# Car Branding Cloud Exercise #

* Using Azure Cloud (Functions, APIM, Storage & WebApp service)
* Pulumi as IaaC (uses terraform internally)
* WebApp based on Next.ts (node.js server framework for React)
* Functions are typescript
* APIM is proxy-like (takes care of function api keys)

### Setup ###
First thing to do is:

(Easiest) either login into azure using azure CLI
```bash
az login
```

or set ARM env vars
```bash
ARM_CLIENT_ID: 
ARM_TENANT_ID: 
ARM_CLIENT_SECRET: 
ARM_SUBSCRIPTION_ID: 
```

After you can just hit
```bash
# builds code & runs/updates infra into dev stack (first time will ask to login into pulumi & create the dev stack)
make up-dev
```
---

**NOTE:** creating APIM resource takes up to 40m-60m alone. This is not `IaaC` bug but how azure takes to make this resource active.

---

After that you should receive an output var `webAppEndpoint`. **The first request takes a while, because of the cold-start.**

### Run locally
As far as I can tell there is no APIM emulator/local (Functions has development kit). So you have to have the infra up and running to develop.

Just go to `src/web-app`:
* `touch .env`
  * APIM_ENDPOINT=`<this value is also outputed from pulumi or just go to portal and get it>`
  * APIM_SUBSCRIPTION_KEY=`<this value is considered a secret and is not outputed, check it from portal>`
* hit `yarn && yarn dev`


### Notes
* No CI/CD (this however is extremely easy with `IaaC`)
* No authentication/authorization (could have use ADD/Okta/Auth0 and then add policies to APIM easily)
* No tests (since not asked and time was short)
* Code is kinda Quick & Dirty, just focused more on `IaaC` itself (since product spec was so easy I assumed that)
* Was fun to try `pulumi` - was on my todo list! :)