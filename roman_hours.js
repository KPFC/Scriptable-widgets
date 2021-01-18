const width=125;
const h=5;
const w = new ListWidget();
w.backgroundColor=new Color("#222222");

const now = new Date();
const here = await Location.current();
const fm = FileManager.iCloud();
// define time const
const weekday = now.getDay();
const year = now.getYear();
const leapyear = ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0) ? true : false;
const minutes=now.getMinutes();

var array = readcache();
bool = false;
if ( array ) {
  if ( array.date == now.toLocaleDateString()) {
    var feast = array.feast;
    var colour = array.colour;
    var times = getdaylength(array.times);
    console.log([feast, colour, times, "read"]);
  } else {
    bool = true;
  }
} else {
  bool = true;
}
if (bool) {
  array = await getfeast();
  var times = getdaylength([null,null,null,null,null]);
  var feast = array[0];
  var colour = array[1];
  savecache([feast, colour, times])
  console.log([feast, colour, times, "saved"]);
}

if (colour == "green") {
  colour="#22aa22";
} else if (colour == "red") {
  colour="#aa2244";
} else if (colour == "black") {
  colour="#000";
} else if (colour == "violet") {
  colour="#929";
} else if (colour == "grey") {
  colour="#ccc";
}
 
if (Device.locale() == "de_DE"){
  getwidget(24*60, (now.getHours() + 1)*60+minutes, "Heute");
  getwidget(7, weekday + 1, "Diese Woche");
  getwidget(30, now.getDate() + 1, "Dieser Monat");
  getwidget(12, now.getMonth() + 1, "Dieses Jahr");
} else {
  hora = gethora();
  getwidget(24*60, now.getHours()*60+minutes, feast);
  getwidget(7, weekday + 1, "Hebdomada");
  getwidget(1, hora[2], hora[0]);
}

Script.setWidget(w);
Script.complete();
w.presentMedium();

// get today's feast from div off
async function getfeast() {
  const version = "Rubrics%201960";
  const divoff = new Request("https://divinumofficium.com/cgi-bin/horas/Pofficium.pl?date1=" + now.getMonth() + "-" + now.getDay() + "-" + now.getYear() + "&version=" + version);
  var html = await divoff.loadString();
  var position = html.search(/FORM ACTION=\"Pofficium.pl\" METHOD=post TARGET=_self>\n<P ALIGN=CENTER><FONT COLOR=(.*?)>(.*?)<BR>/);
  var feast = html.substring(position, position+250).replace(/FORM ACTION=\"Pofficium.pl\" METHOD=post TARGET=_self>\n<P ALIGN=CENTER><FONT COLOR=/, "");
  var colour = feast.substring(0, feast.search(/>/));
  feast = feast.substring(0, feast.search(/<BR>/)).replace(colour+">", "");
  return [feast, colour];
}

function savecache(array) {
  var path = fm.joinPath( fm.documentsDirectory(), 'horacache.json' );
  fm.writeString( path, '{"date":"' + now.toLocaleDateString() + '","feast":"' + array[0] + '","colour":"' + array[1] + '","times":' + JSON.stringify(array[2]) + '}' );
}

function readcache() {
  var path = fm.joinPath( fm.documentsDirectory(), 'horacache.json' );
  return JSON.parse(fm.readString( path ));
}

function getdaylength(array) {
  var lat, long, timediff, sunrise, sunset;
  if (!array[4]) {
    lat = here["latitude"];
    long = here["longitude"];
    console.log([lat,long]);
    timediff = long/180*12;
  } else {
    timediff = array[4];
  }
  var time = now.getUTCHours()+timediff+now.getUTCMinutes()/60;
  if (!array[1]) {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    var date = Math.floor(diff / oneDay);
    const yearlength = leapyear ? 366 : 365;
    if (time>24) {
      time=time-24;
      date = date + 1;
    }
    // count date from Dec 21
    date = date + 10;
    if (date>yearlength) {
      date = date - yearlength;
    } else if (date < 0) {
      date = date + 365;
    }
    const declination = 23.5*Math.cos(date/yearlength*2*3.142);
    sunrise = Math.acos(-Math.tan(lat/180*3.142)*Math.tan(declination/180*3.142))/3.142*12;
    sunset = 24-Math.acos(-Math.tan(lat/180*3.142)*Math.tan(declination/180*3.142))/3.142*12;
    daylength=sunset-sunrise;
  } else {
    time = time>24 ? time-24 : time
    daylength = array[1];
    sunrise = array[2];
    sunset = array[3];
  }
  return [time, daylength, sunrise, sunset, timediff];
}

function gethora () {
  var time = times[0];
  var daylength = times[1];
  var sunrise = times[2];
  var sunset = times[3];
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
  const titlew = w.addText(str);
  titlew.textColor = new Color("#ccc");
  titlew.font = Font.boldSystemFont(13);
  w.addSpacer(6);
  const imgw = w.addImage(creatProgress(total,haveGone));
  imgw.imageSize=new Size(width, h);
  w.addSpacer(6);
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
