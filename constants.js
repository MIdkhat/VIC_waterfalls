    //// PARSE AND FORMAT CONSTANTS
    // const formatDateYearMonthText = d3.timeFormat("%B %Y"),
    // formatDateNumbers = d3.timeFormat("%d%m%Y"),
    // formatDateYearMonthDash = d3.timeFormat("%Y-%m"),
    // parseDateYearMonthDaySlash = d3.timeParse("%Y/%m/%d"),
    // parseDateYearMonthDash = d3.timeParse("%Y-%m"),
    // formatVolume = d3.format(",")	

    //// STRING FUNCTIONS
    String.prototype.capitalize = function() {
        var capitalized = [],
            stringArray = this.split(' ')
        stringArray.forEach(s => capitalized.push(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()));
        return capitalized.join(' ');
    }
    String.prototype.htmlSafe = function() {
        var string = this.replace(/[!\"#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '').replace(/ /g, '-');
        return string.toLowerCase();
    }



    