// define widget geometry
const width=125;
const h=5;
const w = new ListWidget();
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
// put a suntime-stamp to the bottom
const sunhour = Math.floor(times.time);
const sunminute = Math.floor((times.time-sunhour)*60);
var timestamp_txt = sunhour+ ":" + ('0' + sunminute).substr(-2);
// indicate no GPS signal
timestamp_txt = times.gps ? timestamp_txt : "🛰 " + timestamp_txt;
const timestamp = w.addText(timestamp_txt);
timestamp.rightAlignText();
timestamp.textColor = new Color("#ccc");
timestamp.font = Font.boldSystemFont(15);
// save widget
Script.setWidget(w);
Script.complete();
w.presentMedium();

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
  comm = comm.substring(comm.search(/Commemoratio:/)+14);
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
  var strr = str.split("§");
  str = strr[0];
  if (!strr[1]) strr[1] = "";
  if (strr[0].length>42) {
    var strs = str.split(" ~ ");
    const lengthcorrect = strwidthcorr(strs[0]);
    strs[0] = shortname(strs[0], 42-lengthcorrect);
    var b = "";
    while (strs[0].length>42-lengthcorrect) {
      let a = strs[0].split(" ");
      b = a[a.length-1] + " " + b;
      strs[0] = strs[0].replace(" " + a[a.length-1], "");  
    }
    strs[1] = b != "" ? b + "~ " + strs[1] : strs[1];
    const titlew = w.addText(strs[0]);
    titlew.textColor = new Color("#ccc");
    titlew.font = Font.boldSystemFont(13);
    const titlew2 = w.addText(strs[1]);
    titlew2.textColor = new Color("#ccc");
    titlew2.font = Font.boldSystemFont(13);
  } else {
    const titlew = w.addText(str);
    titlew.textColor = new Color("#ccc");
    titlew.font = Font.boldSystemFont(13);
  }
  if (strr[1] != "") {
    strr[1] = shortname('Commemoratio: ' + strr[1], 46-strwidthcorr(strr[1]))
    const titlew3 = w.addText(strr[1]);
    titlew3.textColor = new Color("#ccc");
    titlew3.font = Font.boldSystemFont(11);
  }
  w.addSpacer(3);
  const imgw = w.addImage(creatProgress(total,haveGone));
  imgw.imageSize=new Size(width, h);
  w.addSpacer(5);
}

function strwidthcorr(str) {
  var lengthcorrect = ((str.match(/m/g) || []).length)/2;
  lengthcorrect += ((str.match(/M/g) || []).length);
  lengthcorrect += ((str.match(/æ/g) || []).length)/2;
  lengthcorrect += ((str.match(/w/g) || []).length)/2;
  lengthcorrect += ((str.match(/W/g) || []).length);
  return lengthcorrect;
}

function shortname(str, maxlen) {
  var i = 0;
  while (str.length>maxlen && i<30) {
    switch (i) {
      case 0:
      str = str.replace("Commemoratio", "Comm.");
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
      str = str.replace("Beatæ Mariæ Virginis", "B.\xa0Mariæ\xa0Virginis");  
      break;
      case 12:
      str = str.replace("Virginis", "Virg.");
      break;
      case 13:
      str = str.replace("B.\xa0Mariæ\xa0Virg.", "B.\xa0Mariæ\xa0V.");
      break;
      case 13:
      str = str.replace("B.\xa0Mariæ\xa0V.", "B.\xa0M.\xa0V.");
      break;
      case 14:
      str = str.replace("Hebdomadam", "Hebd.");
      break;
      case 15:
      str = str.replace("Dominica", "Dnca.");
      break;
      case 16:
      str = str.replace(" Secunda", "\xa0II");
      break;
      case 17:
      str = str.replace(" Tertia", "\xa0III");
      break;
      case 18:
      str = str.replace(" Quarta", "\xa0IV");
      break;
      case 19:
      str = str.replace(" Quinta", "\xa0V");
      break;
      case 20:
      str = str.replace(" Sexta", "\xa0VI");
      break;
      case 21:
      str = str.replace("Sabbato", "Sbbo.");
      break;
      case 22:
      str = str.replace("Feria", "Fer.");
      break;
      case 23:
      str = str.replace("Temporum", "Tpm.");
      break;
      case 24:
      str = str.replace("infra", "inf.");
      break;
      case 25:
      str = str.replace("Quadragesimæ", "Quadr.");
      break;
      case 26:
      str = str.replace("Quadragesima", "Quadr.");
      break;
      case 27:
      str = str.replace("Octavam", "Oct.");
      break;
      case 28:
      str = str.replace("Quattuor", "Quat.");
      break;
      case 29:
      str = str.replace("Quadr.", "Xlm.");
      break;
    }
//  console.log(strs[0].length + " " + i)
    i += 1;
  }
  str = str.replace("B. M. V.", "B.\xa0M.\xa0V.");
  str = str.replace(".:", ":");
  return str;
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
