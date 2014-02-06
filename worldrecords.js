var config     = require('./config.json');
var fs         = require('fs');
var nodemailer = require('nodemailer');
var path       = require('path');

var recordFile = path.join(__dirname, "skinny-world-record");

var skinnyWorldRecord = Number(fs.readFileSync(recordFile));

var smtpTransport = nodemailer.createTransport("SMTP", {
	host: config.smtp.host
});

module.exports.submitSkinnyRecord = function(participantCount){
	if(participantCount > skinnyWorldRecord){
		console.info("a new skinny world record: "+participantCount);
		skinnyWorldRecord = participantCount;
		notifyRecordBroken(participantCount);
		saveRecord(participantCount);
	}
};

function notifyRecordBroken(participantCount){
	if(config.smtp.recipients.length > 0) {
		var now = new Date();

		var mailOptions = {
			from: "Endpoint Mix <endpointmix@bluejeansnet.com>",
			to: config.smtp.recipients.join(', '),
			subject: "Skinny world record: "+participantCount,
			html: "On "+now.toLocaleDateString()+" at "+now.toTimeString()+", there were <b>"+participantCount+" people</b> using Skinny at the same time, which is a new record."
		};

		smtpTransport.sendMail(mailOptions, function(err, resp){
			if(err) {
				console.error("could not send email about the new record", err);
			} else {
				console.log("world record notification email sent");
			}
		});
	}
}

function saveRecord(participantCount){
	fs.writeFile(recordFile, String(participantCount), function(err){
		if(err) console.error("could not write world record file", err);
	});
}