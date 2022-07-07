const fs = require('fs');
const axios = require('axios');
const sendgridMail = require('@sendgrid/mail');
const sendgridClient = require('@sendgrid/client');
const core = require('@actions/core');
const zlib = require('zlib');

const setCredentials = () => {
    sendgridClient.setApiKey(process.env.SENDGRID_API_TOKEN);
    sendgridMail.setApiKey(process.env.SENDGRID_API_TOKEN);
};

async function prepareMessage() {
    const { repository, release } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

    const converter = new showdown.Converter();
    const repoName = repository.name;
    const repoURL = repository.html_url;
    const repoDescription = repository.description ? `, ${repository.description.charAt(0).toLowerCase() + repository.description.slice(1)}` : '';
    const releaseVersion = release.tag_name;
    const releaseName = release.name;
    const releaseURL = release.html_url;
    const ownerResponse = await axios.get(repository.owner.url);
    const ownerName = ownerResponse.data.name;

    // Templates
    const subject = `[ANN] ${repoName} ${releaseVersion} [${releaseName}] released!`;
    const footer = `\n\nRegards,\n\nThe ${process.env.SENDER_EMAIL_TEAM} team`;
    const header = `[${repoName}](${repoURL})${repoDescription} reached it's [${releaseVersion}](${releaseURL}) version.`;

    const releaseBody = `<html><head><title>${subject}</title></head><body>` + converter.makeHtml(`#${header}\n\n${release.body}${footer}`).replace('\n', "") + '<div style="text-align: center;font-size:10px;"><p><a href="<%asm_group_unsubscribe_raw_url%>">Unsubscribe</a></p></div></body></html>';

    console.log(releaseBody);

    const sender = process.env.SENDER_EMAIL;

    // const data = {
    //     name: subject,
    //     categories: ['technical_release'],
    //     send_at: 'now',
    //     send_to: {
    //         list_ids: [lists],
    //         all: false
    //     },
    //     email_config: {
    //         subject: subject,
    //         html_content: releaseBody,
    //         suppression_group_id: 18773,
    //         sender_id: 864069
    //     }
    // }
    //
    // return {
    //     url: '/v3/marketing/singlesends',
    //     method: 'POST',
    //     body: data
    // };
    //
    return {
        from: {
            name: ownerName,
            email: sender,
        },
        to: null,
        // cc: lists,
        subject,
        content: [{
            type: 'text/html',
            value: releaseBody
        }],
        categories: ['technical_release'],
        // html: releaseBody,
        asm: {
            group_id: 18773,
            groups_to_display: [
                18773
            ],
        },
    };
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function getContacts(distributionList) {
    console.log({ // get contacts from list
        url: `/v3/marketing/contacts/exports`,
        method: 'POST',
        body: {
            list_ids: [distributionList],
            file_type: 'json'
        }
    });
    const res = await sendgridClient.request({ // get contacts from list
        url: `/v3/marketing/contacts/exports`,
        method: 'POST',
        body: {
            list_ids: [distributionList],
            file_type: 'json'
        }
    });
    console.log('JOBS ', res);
    const jobid = res[1].id;
    var rstatus = null;
    var req = {
        url: `/v3/marketing/contacts/exports/${jobid}`,
        method: 'GET',
    };
    await sleep(5000);
    while ((rstatus = await sendgridClient.request(req))[1].status === 'pending') {
        await sleep(10000);
    }
    rstatus = rstatus[1];
    console.log(rstatus);
    if (rstatus.status === 'ready') {
        var count = rstatus.contact_count;
        console.log(`count contact : ${count}`);
        return await axios.all(rstatus.urls.map((url) => axios.get(url, { headers: { Accept: 'application/json' }, responseType: 'arraybuffer' }))).then((data) => {
            return data.map((gzda) => {
                let v = JSON.parse(zlib.gunzipSync(gzda.data).toString());
                return (v instanceof Array ? v : [v]).map((userinfo) => {
                    return { email: userinfo.email };
                });
            });
        });
    }

    return null;
}

async function run(distributionList) {
    const lists = distributionList;
    const res = await getContacts(distributionList);
    const message = await prepareMessage();
    res.forEach(async (emailTos, i) => {
        message.to = emailTos;
        const r = await sendgridMail.send(message);
        console.log(r);
        console.log(`Mail #${i} sent!`);
    });
}

/**
 * Run
 */
setCredentials();
run(process.env.DISTRIBUTION_LISTS)
    .catch((error) => {
        console.error(error);
        console.error(error.response.body.errors);
        core.setFailed(error.message);
        process.exit(1);
    });
