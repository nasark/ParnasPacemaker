const express = require('express');
const router = new express.Router();
const knex = require('../db/knex')

//serial communication
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const ByteLength = require('@serialport/parser-byte-length')
const path = '/dev/tty.usbmodem0000001234561';        //path for K64F board
const port = new SerialPort(path, { baudRate: 115200, autoOpen: true});

var buf = Buffer.alloc(54);
var verify = Buffer.alloc(2);
const parser = new Readline();


//setting the pace mode
router.post('/pace', function(req, res){
    //grab credentials from request
    let mode = req.body.mode;
    let username = req.body.username;
    let config = req.body.config;


    knex('users') //query db and retrieve [user]
    .where({username})
    .first()
    .then((user)=>{
        //grab the json
        //update preference
        user.config[mode] =  config; //update user config
        knex('users')
        .update('config', user.config) //set our new config
        .where({username})
        .then(()=>{
            console.log("HERE 1")
            payload = req.body
            console.log(payload.mode)
            getByteStream(payload);
            //set bytes

            console.log(buf)
            
            /*port.open(function (err) {
                if (err) {
                  return console.log('Error opening port: ', err.message)
                }
              
                // Because there's no callback to write, write errors will be emitted on the port:
                port.write(buf)
                console.log(buf);
                port.close();
              })*/
             port.write(buf,function (err) {
                if (err) {
                  return console.log('Error opening port: ', err.message)
                }
              
                // Because there's no callback to write, write errors will be emitted on the port:
                console.log(buf);
              })

              //console.log(buf);

              
              //verify = Buffer.from([0, 34]);
              /*verify.writeInt8(0,0)
              verify.writeInt8(1,1)
              //verify = Buffer.from([0,34])
              console.log(verify);
              port.write(verify,function (err) {
                if (err) {
                  return console.log('Error opening port: ', err.message)
                }

                const parser = port.pipe(new ByteLength({length: 54}))
                parser.on('data', console.log)      //to do: store data in a buffer for comparison
                //parser.off();
            }) */

            res.status(200).json({message: "succesfully saved configs for " + mode})
        })



        //write sync and fn to receive data and perform validation
    })
    .catch(err =>{
        res.status(500).json({err, message: "failed to saved configs for " + mode}) //give back error for any reason
    })

});           

function getByteStream (payload){
    let sync = 0, fn = 1;     //22, 85

    buf.writeInt8(sync, 0);        //rxdata[0]
    buf.writeInt8(fn, 1);          //rxdata[1]

    /*buf.writeFloatBE(payload.config.upper);    //upper limit - rxdata[3:4]
    buf.writeFloatBE(payload.config.lower);*/

    buf.writeFloatBE(payload.config.upper, 2);    //upper limit - rxdata[3:4]
    buf.writeFloatBE(payload.config.lower, 6);    //low limit - rxdata[5:6]
    
    if (payload.mode == "AOO"){
        buf.writeFloatBE(2, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.atrial_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(payload.config.atrial_amp*1000, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(0, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(0, 38);       //MSR
        buf.writeFloatBE(0, 42);       //reaction time
        buf.writeFloatBE(0, 46);       //response time
        buf.writeFloatBE(0, 50);       //activity threshold
        }
    else if (payload.mode == "VOO"){
        buf.writeFloatBE(1, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.ventricular_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(0, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(payload.config.ventricular_amp*1000, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(0, 38);       //MSR
        buf.writeFloatBE(0, 42);       //reaction time
        buf.writeFloatBE(0, 46);       //response time
        buf.writeFloatBE(0, 50);       //activity threshold
    }
    else if (payload.mode == "AAI") {
        buf.writeFloatBE(4, 10);   //mode
        buf.writeFloatBE(payload.config.arp, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.atrial_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(payload.config.atrial_amp*1000, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(0, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(0, 38);       //MSR
        buf.writeFloatBE(0, 42);       //reaction time
        buf.writeFloatBE(0, 46);       //response time
        buf.writeFloatBE(0, 50);       //activity threshold
    }
    else if (payload.mode == "VVA") {   // VVI
        buf.writeFloatBE(3, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(payload.config.vrp, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.ventricular_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(0, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(payload.config.ventricular_amp*1000, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(0, 38);       //MSR
        buf.writeFloatBE(0, 42);       //reaction time
        buf.writeFloatBE(0, 46);       //response time
        buf.writeFloatBE(0, 50);       //activity threshold
    }
    else if (payload.mode == "VVI") {   // DOO
        buf.writeFloatBE(5, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.ventricular_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(3900, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(3900, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(0, 38);       //MSR
        buf.writeFloatBE(0, 42);       //reaction time
        buf.writeFloatBE(0, 46);       //response time
        buf.writeFloatBE(0, 50);       //activity threshold
    }
    /*else if (payload.mode == "VOOR") {   // VOOR
        buf.writeFloatBE(6, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(-, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(0, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(payload.config.ventricular_amp*1000, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(-, 38);       //MSR
        buf.writeFloatBE(-, 42);       //reaction time
        buf.writeFloatBE(-, 46);       //response time
        buf.writeFloatBE(-, 50);       //activity threshold
    }
    else if (payload.mode == "AOOR") {   // AOOR
        buf.writeFloatBE(7, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(-, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(payload.config.atrial_amp*1000, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(0, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(-, 38);       //MSR
        buf.writeFloatBE(-, 42);       //reaction time
        buf.writeFloatBE(-, 46);       //response time
        buf.writeFloatBE(-, 50);       //activity threshold
    }
    else if (payload.mode == "VVIR") {   // VVIR
        buf.writeFloatBE(8, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(payload.config.vrp, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.ventricular_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(0, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(payload.config.ventricular_amp*1000, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(-, 38);       //MSR
        buf.writeFloatBE(-, 42);       //reaction time
        buf.writeFloatBE(-, 46);       //response time
        buf.writeFloatBE(-, 50);       //activity threshold
    }
    else if (payload.mode == "AAIR") {   // AAIR
        buf.writeFloatBE(9, 10);   //mode
        buf.writeFloatBE(payload.config.arp, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.atrial_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(payload.config.atrial_amp*1000, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(0, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(-, 38);       //MSR
        buf.writeFloatBE(-, 42);       //reaction time
        buf.writeFloatBE(-, 46);       //response time
        buf.writeFloatBE(-, 50);       //activity threshold
    }
    else if (payload.mode == "DOOR") {   // DOOR
        buf.writeFloatBE(10, 10);   //mode
        buf.writeFloatBE(0, 14);   //arfp - rxdata[8:9]
        buf.writeFloatBE(0, 18);  //vrfp - rxdata[10:11]
        buf.writeFloatBE(payload.config.ventricular_pw, 22);     //pulse width - rxdata[12:13]
        buf.writeFloatBE(0, 26);         //AV delay - rxdata[14:15]            250ms for dual pacing modes (DOO, DOOR)
        buf.writeFloatBE(-, 30) ; //atrial amplitude - rxdata[16:19]   convert to mv by *1000
        buf.writeFloatBE(-, 34) ;        //ventricular amplitude - rxdata [20:23]
        buf.writeFloatBE(-, 38);       //MSR
        buf.writeFloatBE(-, 42);       //reaction time
        buf.writeFloatBE(-, 46);       //response time
        buf.writeFloatBE(-, 50);       //activity threshold
    } */
}


module.exports = router;