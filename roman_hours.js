// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: hourglass-half;
// define widget geometry
var debug = "";
const small = (config.widgetFamily === 'small')
console.log(small)
const width = small ? 125 : 125;
const h = small ? 4 : 5;
var w = new ListWidget();
w.backgroundColor=new Color("#111111");

// define time const
const now = new Date();
const weekday = now.getDay();
const monthday = now.getDate();
const month = now.getMonth()+1;
const year = now.getFullYear();

const leapyear = ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0) ? true : false;
const minutes = now.getMinutes();
const hours = now.getHours();

// read cache
const fm = FileManager.iCloud();
var cache = readcache();
// change Background image
w.backgroundImage=fm.readImage( fm.joinPath( fm.documentsDirectory(), 'Background_m_m_db.jpg' ));

var bool = 1;
var called = 0;
var times = {lat:null, long:null, gps:false};
// if !array the cache file was empty or deleted
if ( cache ) {
  // only check divoff.com once a day
  times.lat = cache.times.lat;
  times.long = cache.times.long;
  times.gps = cache.times.gps;
  if ( cache.timestamp.date == now.toLocaleDateString()) {
    if ( cache.timestamp.hour === hours && cache.timestamp.minute === minutes ) {
      called = cache.timestamp.called + 1;
      bool = cache.timestamp.called > 2 ? -1 : 2; // usually > 2
    }
  } else {
    bool = -1;
  }
  if (!times.gps) {
    bool = -1;
  }
} else {
  bool = -2;
}
var feast, colour;
console.log(bool);
if (bool > 0) {
  feast = cache.feast;
  colour = cache.colour;
  comm = cache.comm;
  commc = cache.commcolour;
  times = await getdaylength(cache.times);
  console.log([feast, colour, comm, commc, times, "read"]);  
} else if (bool < 0) {
  try {
    var array = await getfeast();
    times = await getdaylength({lat:times.lat, long:times.long, gps:times.gps});
    feast = array[0];
    colour = array[1];
    comm = array[2];
    commc = array[3];
    console.log([feast, colour, comm, commc, times, "calculated"]);
  } catch (e) {
    if (bool==-1) {
      feast = cache.feast;
      colour = cache.colour;
      times = await getdaylength(cache.times);
      console.log([feast, colour, times, "no internet"]);
    } else {
      console.log("Failed to connect to internet and did not find a cache file. Try again later.");
    }
  }
}
savecache([feast, colour, comm, commc, times]);

// assing hex-colourcodes to colour-names
if (colour == "green") {
  colour="#228822";
} else if (colour == "red") {
  colour="#aa2244";
} else if (colour == "black") {
  //colour="#292929";
  colour = "#cccccc";
} else if (colour == "purple") {
  colour="#60007f";
} else if (colour == "blue") {
  colour="#00387b";
}
// load canonical hour
const hora = gethora();
// define widget elements
getwidget(1440, hours*60+minutes, feast + '§' + comm);
getwidget(168, weekday*24+hours, "Hebdomada");
getwidget(1, hora[2], hora[0]);
// save widget
Script.setWidget(w);
Script.complete();
w.presentMedium();

/* const note = new Notification();
note.title = small ? "small" : "medium";
note.body = debug;
notedate = new Date()
notedate.setMinutes(now.getSeconds()+7)
note.setTriggerDate(notedate)
note.schedule(); */

// saves date-stamp, feast-name, colour and calculated sunrise and -set times to cache
function savecache(array) {
  const path = fm.joinPath( fm.documentsDirectory(), 'horacache.json' );
  fm.writeString( path, '{"timestamp":{"date":"' + now.toLocaleDateString() + '","hour":' + hours + ',"minute":' + minutes + ',"called":' + called + '},"feast":"' + array[0] + '","colour":"' + array[1] + '","comm":"' + array[2] + '","commcolour":"' + array[3] + '","times":' + JSON.stringify(array[4]) + '}' );
}

// reads cache and returns array
function readcache() {
  const path = fm.joinPath( fm.documentsDirectory(), 'horacache.json' );
  return JSON.parse(fm.readString( path ));
}

// get today's feast from div off
async function getfeast() {
  //const version = "Rubrics%201960";
  const version = "Divino%20Afflatu";
  const d = monthday != 1 ? monthday-1 : monthday+1;
  const command = monthday != 1 ? "next" : "previous";
  const divoff = new Request("https://divinumofficium.com/cgi-bin/horas/Pofficium.pl?date1=" + month + "-" + d + "-" + year + "&version=" + version + "&command=" + command);
console.log(divoff.url)
  const html = await divoff.loadString();
  //console.log(html)
  const position = html.search(/FORM ACTION=\"Pofficium.pl\" METHOD=post TARGET=_self>\n<P ALIGN=CENTER><FONT COLOR=(.*?)>(.*?)<BR>/);
  var feast = html.substring(position, position+500).replace(/FORM ACTION=\"Pofficium.pl\" METHOD=post TARGET=_self>\n<P ALIGN=CENTER><FONT COLOR=/, "");
console.log(feast)
  const colour = feast.substring(0, feast.search(/>/));
  var comm = feast.substring(feast.search(/82%; color:/), feast.search(/<\/I><\/SPAN>/));
  const commcolour = comm.substring(11, comm.search(/;"><I>/));
  comm = comm.substring(comm.search(/<I>/)+3);
  feast = feast.substring(0, feast.search(/<BR>/)).replace(colour+">", "");
  return [feast, colour, comm, commcolour];
}

async function getdaylength( time_object ) {
  var lat, long, timediff, sunrise, sunset;
  if (!time_object.timediff) {
    try {
      const here = await Location.current();
      lat = here["latitude"];
      long = here["longitude"];
      time_object.gps = true;
    } catch (e) {
      console.log(e)
      lat = time_object.lat ? time_object.lat : 0;
      long = time_object.long ? time_object.long : 0;
      console.log("Loaded location from cache");  
      time_object.gps = false;
    }
    lat = lat>66.5 ? 66.5 : lat<-66.5 ? -66.5 : lat;
    timediff = long/180*12;
  } else {
    timediff = time_object.timediff;
  }
  var time = now.getUTCHours()+timediff+now.getUTCMinutes()/60;
  if (!time_object.daylength) {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    var date = Math.floor(diff / oneDay);
    const yearlength = leapyear ? 366 : 365;
    if (time>24) {
      time -= 24;
      date += 1;
    }
    // count date from Dec 21
    date += 10;
    if (date>yearlength) {
      date -= yearlength;
    } else if (date < 0) {
      date += 365;
    }
    const declination = 23.43655*Math.cos(date/yearlength*2*3.142);
    sunrise = Math.acos(-Math.tan(lat/180*3.142)*Math.tan(declination/180*3.142))/3.142*12;
    sunset = 24-Math.acos(-Math.tan(lat/180*3.142)*Math.tan(declination/180*3.142))/3.142*12;
    daylength=sunset-sunrise;
  } else {
    time = time>24 ? time-24 : time
    daylength = time_object.daylength;
    sunrise = time_object.sunrise;
    sunset = time_object.sunset;
    lat = time_object.lat;
    long = time_object.long;
  }
  return {time:time, daylength:daylength, sunrise:sunrise, sunset:sunset, timediff:timediff, lat:lat, long:long, gps:time_object.gps};
}

function gethora () {
  var time = times.time;
  var daylength = times.daylength;
  var sunrise = times.sunrise;
  var sunset = times.sunset;
  if (time<sunrise || time > sunset) {
    time = time < sunrise ? time+24 : time;
    var vigiliae = 4*(time-sunset)/(24-daylength);
    var vigilia = Math.ceil(vigiliae);
    var name;
    switch (vigilia) {
      case 1:
      name = "Vigilia prima";
      break;
      case 2:
      name = "Vigilia secunda";
      break;
      case 3:
      name = "Vigilia tertia";
      break;
      case 4:
      name = "Vigilia quarta";
      break;
    }
    return [name, vigilia, vigiliae-vigilia+1];
  } else {
    var horae = (time-sunrise)/(daylength/12);
    var hora = Math.ceil(horae);
    switch (hora) {
      case 1:
      return ["Hora prima", hora, horae-hora+1];
      case 2:
      return ["Hora secunda", hora, horae-hora+1];
      case 3:
      return ["Hora tertia", hora, horae-hora+1];
      case 4:
      return ["Hora quarta", hora, horae-hora+1];
      case 5: 
      return ["Hora quinta", hora, horae-hora+1];
      case 6:
      return ["Hora sexta", hora, horae-hora+1];
      case 7:
      return ["Hora septima", hora, horae-hora+1];
      case 8:
      return ["Hora octava", hora, horae-hora+1];
      case 9:
      return ["Hora nona", hora, horae-hora+1];
      case 10:
      return ["Hora decima", hora, horae-hora+1];
      case 11:
      return ["Hora undecima", hora, horae-hora+1];
      case 12:
      return ["Hora duodecima", hora, horae-hora+1];
    }
  }
}

function getwidget(total, haveGone, str) {
  const maxlen = small ? 19 : 42;
  const normalfont = small ? 11 : 13;
  var strr = str.split("§");
  str = strr[0];
  if (!strr[1]) strr[1] = "";
  // two lines
  if (strr[0].length>maxlen) {
    var strs = str.split(" ~ ");
    var lengthcorrect = strwidthcorr(strs[0]);
    strs[0] = shortname(strs[0], maxlen-lengthcorrect);
    lengthcorrect = strwidthcorr(strs[0])
    var b = "";
    while (strs[0].length>maxlen-lengthcorrect) {
      let a = strs[0].split(" ");
      b = a[a.length-1] + " " + b;
      a.pop();
      strs[0] = a.join(' ')
    }
    strs[0] = longname(strs[0], maxlen-lengthcorrect);
    lengthcorrect = strwidthcorr(strs[1])
    strs[1] = b != "" ? shortname(b + "~ " + strs[1], maxlen-lengthcorrect) : strs[1];
    const titlew = w.addText(strs[0]);
    titlew.textColor = new Color("#ccc");
    titlew.font = Font.boldSystemFont(normalfont);
    if (small) titlew.centerAlignText()
    lengthcorrect = strwidthcorr(longname(strs[1], 2*maxlen));
//     third line
    if (strs[1].length>maxlen-lengthcorrect) {
      var strq = strs[1].split(" ~ ");
      console.log(strq)
      lengthcorrect = strwidthcorr(strq[0]);
      strq[0] = shortname(strq[0], maxlen-lengthcorrect);
      lengthcorrect = strwidthcorr(strq[0])
      b = "";
      while (strq[0].length>maxlen-lengthcorrect) {
        let a = strq[0].split(" ");
        b = a[a.length-1] + " " + b;
        a.pop();
        strq[0] = a.join(' ');
      }
      strq[0] = longname(strq[0], maxlen-lengthcorrect);
      lengthcorrect = strwidthcorr(strq[1])
      strq[1] = b != "" ? shortname(longname(b + "~ " + strq[1], maxlen), maxlen-lengthcorrect) : longname(strq[1], maxlen-lengthcorrect);
      const titlew2 = w.addText(strq[0]);
      titlew2.textColor = new Color("#ccc");
      titlew2.font = Font.boldSystemFont(normalfont);
      if (small) titlew2.centerAlignText();
      const titlew3 = w.addText(strq[1]);
      titlew3.textColor = new Color("#ccc");
      titlew3.font = Font.boldSystemFont(normalfont);
      if (small) titlew3.centerAlignText();
    } else {
      const titlew2 = w.addText(strs[1]);
      titlew2.textColor = new Color("#ccc");
      titlew2.font = Font.boldSystemFont(normalfont);
      if (small) titlew2.centerAlignText();
    }
  } else {
    const titlew = w.addText(str);
    titlew.textColor = new Color("#ccc");
    titlew.font = Font.boldSystemFont(normalfont);
  }
  if (strr[1] != "") {
    if (strr[1].length>Math.floor(maxlen*1.3)) {
      lengthcorrect = strwidthcorr(strr[1]);
      strr[1] = shortname(strr[1], Math.floor(maxlen*1.2)-lengthcorrect);
      lengthcorrect = strwidthcorr(strr[1])
      b = "";
      while (strr[1].length>Math.floor(maxlen*1.1)-lengthcorrect) {
        let a = strr[1].split(" ");
        b = a[a.length-1] + " " + b;
        a.pop();
        strs[0] = a.join(' ');
      }
      strr[1] = longname(b, Math.floor(maxlen*1.1)-lengthcorrect);
      lengthcorrect = strwidthcorr(strr[2])
      strr[2] = shortname(longname(b, maxlen*2), Math.floor(maxlen*1.1)-lengthcorrect);
      const titlewc = w.addText(strr[1]);
      titlewc.textColor = new Color("#ccc");
      titlewc.font = Font.boldSystemFont(normalfont-2);
      if (small) titlewc.centerAlignText();
      const titlewc2 = w.addText(strr[2]);
      titlewc2.textColor = new Color("#ccc");
      titlewc2.font = Font.boldSystemFont(normalfont-2);
      if (small) titlewc2.centerAlignText();
    } else {
      strr[1] = shortname(longname(strr[1], maxlen*2), Math.floor(maxlen*1.1)-strwidthcorr(strr[1]))
      const titlewc = w.addText(strr[1]);
      titlewc.textColor = new Color("#ccc");
      titlewc.font = Font.boldSystemFont(normalfont-2);
    }
  }
  w.addSpacer(normalfont-10);
  const line = w.addStack();
  const imgt = line.addImage(creatProgress(total,haveGone));
  imgt.imageSize = new Size(width, h);
  // Add timstamp
  if (total === 1) {
    const sunhour = Math.floor(times.time);
    const sunminute = Math.floor((times.time-sunhour)*60);
    var timestamp_txt = sunhour+ ":" + ('0' + sunminute).substr(-2);
  // indicate no GPS signal
    timestamp_txt = times.gps ? timestamp_txt : "🛰 " + timestamp_txt;
    var timestamp;
    if (!small) {
      line.addSpacer()
      timestamp = line.addText(timestamp_txt);
    } else {
      w.addSpacer(3);
      timestamp = w.addText(timestamp_txt);
    }
    timestamp.textColor = new Color("#ccc");
    timestamp.font = Font.boldSystemFont(normalfont+2);
    timestamp.centerAlignText();
  } else {
    w.addSpacer(normalfont-8);
  }
}

function strwidthcorr(str) {
  var lengthcorrect = ((str.match(/m/g) || []).length);
  lengthcorrect += ((str.match(/M/g) || []).length);
  lengthcorrect += ((str.match(/æ/g) || []).length);
  lengthcorrect += ((str.match(/w/g) || []).length);
  lengthcorrect += ((str.match(/W/g) || []).length);
  return lengthcorrect;
}

function shortname(str, maxlen) {
  var i = 0;
  while (str.length>maxlen && i<35) {
    switch (i) {
      case 0:
      str = str.replace("Commemoratio", "Comm.");
      str = str.replace("Tempora", "Temp.");
      break;
      case 1:
      str = str.replace("Confessoris", "Conf.");
      break;
      case 2:
      str = str.replace("Martyris", "Mart.");  
      break;
      case 3:
      str = str.replace("Martyrum", "Mm.");
      break;
      case 4:
      str = str.replace("Ecclesiæ Doctoris", "Ecclesiæ\xa0Doctor.");
      break;
      case 5:
      str = str.replace("Ecclesiæ\xa0Doctor.", "Eccl.\xa0Doct.");    
      break;
      case 6:
      str = str.replace("Episcopi", "Ep.");      
      break;
      case 7:
      str = str.replace("Virginum", "Vm.");
      break;
      case 8:
      str = str.replace("Apostoli", "Ap.");
      break;
      case 9:
      str = str.replace("Viduæ", "Vid.");
      break;
      case 10:
      str = str.replace("Ordinis", "Ord.");
      break;
      case 11:
      str = str.replace("Beatæ Mariæ Virginis", "B.\xa0Mariæ Virginis");  
      break;
      case 12:
      str = str.replace("Virginis", "Virg.");
      str = str.replace("Archangeli", "Archang.");
      break;
      case 13:
      str = str.replace("B.\xa0Mariæ Virg.", "B.\xa0Mariæ\xa0V.");
      break;
      case 14:
      str = str.replace("B.\xa0Mariæ\xa0V.", "B.\xa0M.\xa0V.");
      break;
      case 15:
      str = str.replace("Hebdomadam", "Hebd.");
      break;
      case 16:
      str = str.replace("Dominica", "Dnca.");
      str = str.replace(" Secunda", "\xa0II");
      str = str.replace(" Tertia", "\xa0III");
      str = str.replace(" Quarta", "\xa0IV");
      str = str.replace(" Quinta", "\xa0V");
      str = str.replace(" Sexta", "\xa0VI");
      str = str.replace("Sabbato", "Sbbo.");
      str = str.replace(" secunda", "\xa0II");
      str = str.replace(" tertia", "\xa0III");
      str = str.replace(" quarta", "\xa0IV");
      str = str.replace(" quinta", "\xa0V");
      str = str.replace(" sexta", "\xa0VI");
      break;
      case 17:
      str = str.replace("Quadragesimæ", "Quadrag.");
      break;
      case 18:
      str = str.replace("Quadragesima", "Quadr.");
      break;
      case 19:
      str = str.replace("Temp.", "Tmp.")
      break;
      case 22:
      str = str.replace("Feria", "Fer.");
      break;
      case 23:
      str = str.replace("Temporum", "Tpm.");
      break;
      case 24:
      str = str.replace("infra", "inf.");
      str = str.replace("Infra", "Inf.");
      break;
      case 25:
      str = str.replace("Octavam", "Oct.");
      str = str.replace("octavam", "oct.");
      break;
      case 26:
      str = str.replace("Quattuor", "Quat.");
      break;
      case 28:
      str = str.replace("Duplex", "Dupl.");
      str = str.replace("Semiduplex", "Semidupl.");
      str = str.replace("Simplex", "Simpl.");
      break;
      case 29:
      str = str.replace("classis", "cl.");
      break;
      case 30:
      str = str.replace("Semidupl.", "Semid.");
      str = str.replace("majus", "maj.");
      break;
    }
//  console.log(strs[0].length + " " + i)
    i += 1;
  }
  str = str.replace("B. M. V.", "B.\xa0M.\xa0V.");
  str = str.replace(".:", ":");
  return str;
}

function longname(str, maxlen) {
  var str_out = str;
  var i = 35;
  while (str.length<maxlen && i>0) {
    switch (i) {
      case 0:
      str = str.replace("Comm.", "Commemoratio");
      str = str.replace("Temp.", "Tempora");
      break;
      case 1:
      str = str.replace("Conf.", "Confessoris");
      break;
      case 2:
      str = str.replace("Mart.", "Martyris");  
      break;
      case 3:
      str = str.replace("Mm.", "Martyrum");
      break;
      case 4:
      str = str.replace("Ecclesiæ\xa0Doctor.", "Ecclesiæ Doctoris");
      break;
      case 5:
      str = str.replace("Eccl.\xa0Doct.", "Ecclesiæ\xa0Doctor.");    
      break;
      case 6:
      str = str.replace("Ep.", "Episcopi");      
      break;
      case 7:
      str = str.replace("Vm.", "Virginum");
      break;
      case 8:
      str = str.replace("Ap.", "Apostoli");
      break;
      case 9:
      str = str.replace("Vid.", "Viduæ");
      break;
      case 10:
      str = str.replace("Ord.", "Ordinis");
      break;
      case 11:
      str = str.replace("B.\xa0Mariæ Virginis", "Beatæ Mariæ Virginis");  
      break;
      case 12:
      str = str.replace("Virg.", "Virginis");
      str = str.replace("Archang.", "Archangeli");
      break;
      case 13:
      str = str.replace("B.\xa0Mariæ\xa0V.", "B.\xa0Mariæ Virg.");
      break;
      case 14:
      str = str.replace("B.\xa0M.\xa0V.", "B.\xa0Mariæ\xa0V.");
      break;
      case 15:
      str = str.replace("Hebd.", "Hebdomadam");
      break;
      case 16:
      str = str.replace("Dnca.", "Dominica");
      str = str.replace("\xa0II", " Secunda");
      str = str.replace("\xa0III", " Tertia");
      str = str.replace("\xa0IV", " Quarta");
      str = str.replace("\xa0V", " Quinta");
      str = str.replace("\xa0VI", " Sexta");
      str = str.replace("Sbbo.", "Sabbato");
      break;
      case 17:
      str = str.replace("Quadrag.", "Quadragesimæ");
      break;
      case 18:
      str = str.replace("Quadr.", "Quadragesima");
      break;
      case 19:
      str = str.replace("Tmp.", "Temp.")
      break;
      case 22:
      str = str.replace("Feria", "Fer.");
      break;
      case 23:
      str = str.replace("Tmp.", "Temporum");
      break;
      case 24:
      str = str.replace("inf.", "infra");
      str = str.replace("Inf.", "Infra");
      break;
      case 25:
      str = str.replace("Oct.", "Octavam");
      str = str.replace("oct.", "octavam");
      break;
      case 26:
      str = str.replace("Quat.", "Quattuor");
      break;
      case 28:
      str = str.replace("Dupl.", "Duplex");
      str = str.replace("Semidupl.", "Semiduplex");
      str = str.replace("Simpl.", "Simplex");
      break;
      case 29:
      str = str.replace("cl.", "classis");
      break;
      case 30:
      str = str.replace("Semid.", "Semidupl.");
      str = str.replace("maj.", "majus");
      break;
    }
    if (str.length < maxlen) {
      str_out = str;
    }
//  console.log(strs[0].length + " " + i)
    i -= 1;
  }
  str_out = str_out.replace(".:", ":");
  return str_out;
}

function creatProgress(total,havegone) {
  const context =new DrawContext();
  context.size=new Size(width, h);
  context.opaque=false;
  context.respectScreenScale=true;
  context.setFillColor(new Color("#48484b"));
  const path = new Path();
  path.addRoundedRect(new Rect(0, 0, width, h), 3, 2);
  context.addPath(path);
  context.fillPath();
  context.setFillColor(new Color(colour));
  const path1 = new Path();
  path1.addRoundedRect(new Rect(0, 0, width*havegone/total, h), 3, 2);
  context.addPath(path1);
  context.fillPath();
  return context.getImage();
}

function setNotification() {
  
}

function regionalcalendar() {
//   use local feast of archdiocese of Bamberg
  switch (month) {
    case 2:
    switch (monthday) {
      case 1:
      return ["Commemoratio S. Brigidæ Virginis", "com"];
      case 4:
      return ["S. Dorotheæ Virginis et Martyris ~ Semiduplex", "red"];
      case 16:
      return ["S. Julianæ Virginis et Martyris ~ Simplex", "red"];  
    }
    break;
    case 3:
    switch (monthday) {
      case 3:
      return ["S. Cunegundis Virginis Imperatricis ~ Duplex I. classis", "white"];  
      case 12:
      return ["Canonizatio S. Henrici Imperatoris et Confessoris ~ Duplex", "white"];  
      case 17:
      return ["S. Gertrudis Virginis ~ Semiduplex", "white"];  
      case 29:
      return ["Canonizatio S. Cunegundis Virginis ~ Duplex", "white"];  
    }
    break;
    case 4:
    switch (monthday) {
      case 4:
      return ["S. Ambrosii Episcopi Confessoris et Ecclesia Doctoris ~ Duplex", "white"];  
      case 11:
      return ["Commemoratio S. Isacii Confessoris", "com"];  
      case 25:
      return ["S. Georgii Martyris Ecclesiæ Cathedralis Bamberg, Patroni ~ Duplex II. classis", "red"];  
    }
    break;
    case 5:
    switch (monthday) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      if (weekday===6) {
        return ["Beatæ Mariæ Virginis Patronæ Bavariæ ~ Duplex I. classis", "white"];
      }
      break;
    }
    break;
  }
}
