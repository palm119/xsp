/**
 * OLED119 extension for makecode
 * Base on OLED Package from microbit/micropython Chinese community.
 *   https://github.com/makecode-extensions/OLED12864_I2C
 */

// 6x8 font
const Font_5x7 = hex`000000000000005F00000007000700147F147F14242A072A12231308646237495522500005030000001C2241000041221C00082A1C2A0808083E080800503000000808080808006060000020100804023E5149453E00427F400042615149462141454B311814127F1027454545393C4A49493001710905033649494936064949291E003636000000563600000008142241141414141441221408000201510906324979413E7E1111117E7F494949363E414141227F4141221C7F494949417F090901013E414151327F0808087F00417F41002040413F017F081422417F404040407F0204027F7F0408107F3E4141413E7F090909063E4151215E7F09192946464949493101017F01013F4040403F1F2040201F7F2018207F63140814630304780403615149454300007F4141020408102041417F000004020102044040404040000102040020545454787F484444383844444420384444487F3854545418087E090102081454543C7F0804047800447D40002040443D00007F10284400417F40007C041804787C0804047838444444387C14141408081414187C7C080404084854545420043F4440203C4040207C1C2040201C3C4030403C44281028440C5050503C4464544C44000836410000007F000000413608000201020402`

//% color=#005544 icon="\uf26c" block="老许显示屏"
//% groups='["滚动显示", "位置显示", "画图", "可选"]'
namespace OLED119 {
    export enum Display {
        //% block="ON"
        On = 1,
        //% block="OF"
        Off = 0
    }

    const MIN_X = 0
    const MIN_Y = 0
    const MAX_X = 127
    const MAX_Y = 63

    let _I2CAddr = 60
    let _screen = pins.createBuffer(1025)
    let _buf2 = pins.createBuffer(2)
    let _buf3 = pins.createBuffer(3)
    let _buf4 = pins.createBuffer(4)
    let _buf7 = pins.createBuffer(7)
    let _buf13 = pins.createBuffer(13)
    _buf7[0] = 0x40
    _buf13[0] = 0x40
    let _DRAW = 1
    let _cx = 0
    let _cy = 0

    let _ZOOM = 0
    let _DOUBLE = 0

    function cmd1(d: number) {
        let n = d % 256;
        pins.i2cWriteNumber(_I2CAddr, n, NumberFormat.UInt16BE);
    }

    function cmd2(d1: number, d2: number) {
        _buf3[0] = 0;
        _buf3[1] = d1;
        _buf3[2] = d2;
        pins.i2cWriteBuffer(_I2CAddr, _buf3);
    }

    function cmd3(d1: number, d2: number, d3: number) {
        _buf4[0] = 0;
        _buf4[1] = d1;
        _buf4[2] = d2;
        _buf4[3] = d3;
        pins.i2cWriteBuffer(_I2CAddr, _buf4);
    }

    function set_pos(col: number = 0, page: number = 0) {
        cmd1(0xb0 | page) // page number
        cmd1(0x00 | (col % 16)) // lower start column address
        cmd1(0x10 | (col >> 4)) // upper start column address    
    }

    // clear bit
    function clrbit(d: number, b: number): number {
        if (d & (1 << b))
            d -= (1 << b)
        return d
    }

    /**
     * draw / refresh screen
     */
    function draw(d: number) {
        if (d > 0) {
            set_pos()
            pins.i2cWriteBuffer(_I2CAddr, _screen)
        }
    }

    function char(c: string, col: number, row: number, color: number = 1) {
        let p = (Math.min(127, Math.max(c.charCodeAt(0), 32)) - 32) * 5
        let m = 0
        let ind = col + row * 128 + 1


        if(_DOUBLE)
        {

            for(let i = 0; i < 5; i++)
            {
                let l = 0
                for(let j = 0; j < 8; j++)
                {
                     if(color > 0 ? Font_5x7[p + i] & (1 << j) : !(Font_5x7[p + i] & (1 << j)))
                    {
                        pixel(col + m, row * 8 + l)
                        pixel(col + m, row * 8 + l + 1)

                        pixel(col + m + 1, row * 8 + l)
                        pixel(col + m + 1, row * 8 + l + 1)
                    }

                    l += 2
                }
                m += 2
            }

            let l = 0
            for(let j = 0; j < 8; j++)
            {
                if(color == 0)
                {
                    pixel(col + 10, row * 8 + l)
                    pixel(col + 10, row * 8 + l + 1)

                    pixel(col + 11, row * 8 + l)
                    pixel(col + 11, row * 8 + l + 1)
                }

                l += 2
            }

        }else{

            let j = 0

            for (let i = 0; i < 5; i++) {
                _screen[ind + i] = (color > 0) ? Font_5x7[p + i] : Font_5x7[p + i] ^ 0xFF
                
                if(_ZOOM){
                    _buf13[j + 1] = _screen[ind + i]
                    _buf13[j + 2] = _screen[ind + i]

                }else{
                    _buf7[i + 1] = _screen[ind + i]
                }

                j += 2
            }

            _screen[ind + 5] = (color > 0) ? 0 : 0xFF

            if(_ZOOM)
            {
            _buf13[12] = _screen[ind + 5] 
            }else{
            _buf7[6] = _screen[ind + 5]
            }
            
            set_pos(col, row)
            if(_ZOOM)
            {
                pins.i2cWriteBuffer(_I2CAddr, _buf13)
            }else{
                pins.i2cWriteBuffer(_I2CAddr, _buf7)
            }

        }
    }

    function scroll() {
        _cx = 0

        if(_DOUBLE)
        {
            _cy +=2
        }else{
            _cy++
        }
        if (_cy > 7) {
            _cy = 7
            _screen.shift(128)
            _screen[0] = 0x40
            draw(1)
        }
    }

    /**
     * 屏幕上滚动显示字符串
     */
    //% block="显示字符串 %s|新行 %newline"
    //% s.defl="string"
    //% newline.defl=true
    //% weight=88 blockGap=8 inlineInputMode=inline
    //% group="滚动显示"
    export function printString(s: string, newline: boolean = true) {
        let steps = 0
        if(_DOUBLE)
        {
            steps = 12
        }else{
            steps = 6
        }
    
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), _cx, _cy, 1)
            _cx += steps
            if (_cx > 120) {
                scroll()
            }
        }
        if (newline) {
            scroll()
        }
        
        if(_DOUBLE)draw(1)
    }

    /**
    * 屏幕上滚动显示数字 
    */
    //% block="显示数字 %num|新行 %newline"
    //% s.defl="0"
    //% newline.defl=true
    //% weight=86 blockGap=8 inlineInputMode=inline
    //% group="滚动显示"
    export function printNumber(num: number, newline: boolean = true) {
        printString(num.toString(), newline)
    }

    /**
     * 在特定位置显示字符串. 记住：同一个位置用空字符串 ("  ") 去删除当前显示内容.
     */
    //% blockId="OLED12864_I2C_SHOWSTRING" block="显示字符串 %s|在 列 %col|行 %row|颜色 %color"
    //% s.defl='Hello'
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=78 blockGap=8 inlineInputMode=inline
    //% group="位置显示"
    export function showString(s: string, col: number, row: number, color: number = 1) {
        let steps = 0
        if(_DOUBLE)
        {
            steps = 12
            row *= 2
        }else{
            steps = 6
        }
        for (let n = 0; n < s.length; n++) {
            char(s.charAt(n), col, row, color)
            col += steps

        }

        if(_DOUBLE)draw(1)
    }

    /**
     * 在特定位置显示一串数字. 记住：同一个位置用空字符串 ("  ") 去删除当前显示内容.
     */
    //% blockId="OLED12864_I2C_NUMBER" block="显示数字 %num|在 列 %col|行 %row|颜色 %color"
    //% num.defl=100
    //% col.max=120 col.min=0 col.defl=0
    //% row.max=7 row.min=0 row.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=76 blockGap=8 inlineInputMode=inline
    //% group="位置显示"
    export function showNumber(num: number, col: number, row: number, color: number = 1) {
        showString(num.toString(), col, row, color)
    }

    /**
     * 画一个点，颜色=1 显示，颜色=0 隐藏.
     */
    //% blockId="OLED12864_I2C_PIXEL" block="画点在 x %x|y %y|颜色 %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% color.max=1 color.min=0 color.defl=1
    //% weight=68 blockGap=8
    //% group="画图"
    export function pixel(x: number, y: number, color: number = 1) {
        let page = y >> 3
        let shift_page = y % 8
        let ind = x + page * 128 + 1
        let b = (color) ? (_screen[ind] | (1 << shift_page)) : clrbit(_screen[ind], shift_page)
        _screen[ind] = b
        /*if (_DRAW) {
            set_pos(x, page)
            _buf2[0] = 0x40
            _buf2[1] = b
            pins.i2cWriteBuffer(_I2CAddr, _buf2)
        }*/
    }

    /**
     * 绘制水平线. 使用颜色 = 1 去画线，使用颜色 = 0 去删除它.
     */
    //% blockId="OLED12864_I2C_HLINE" block="画水平线 在 x %x|y %y|长度 %len|颜色 %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=67 blockGap=8 inlineInputMode=inline
    //% group="画图"
    export function horizontalLine(x: number, y: number, len: number, color: number = 1) {
        let _sav = _DRAW
        if ((y < MIN_Y) || (y > MAX_Y)) return
        _DRAW = 0
        for (let i = x; i < (x + len); i++)
            if ((i >= MIN_X) && (i <= MAX_X))
                pixel(i, y, color)
        _DRAW = _sav
        draw(_DRAW)
    }

    /**
     * 绘制垂直竖线. 使用颜色 = 1 去画线，使用颜色 = 0 去删除它.
     */
    //% blockId="OLED12864_I2C_VLINE" block="画垂直线 在 x %x|y %y|长度 %len|颜色 %color"
    //% x.max=127 x.min=0 x.defl=0
    //% y.max=63 y.min=0 y.defl=0
    //% len.max=128 len.min=1 len.defl=16
    //% color.max=1 color.min=0 color.defl=1
    //% weight=66 blockGap=8 inlineInputMode=inline
    //% group="画图"
    export function verticalLine(x: number, y: number, len: number, color: number = 1) {
        let _sav = _DRAW
        _DRAW = 0
        if ((x < MIN_X) || (x > MAX_X)) return
        for (let i = y; i < (y + len); i++)
            if ((i >= MIN_Y) && (i <= MAX_Y))
                pixel(x, i, color)
        _DRAW = _sav
        draw(_DRAW)
    }

    /**
     * 绘制任意直线. 使用颜色 = 1 去画线，使用颜色 = 0 去删除它.
     */
    //% blockId="OLED12864_I2C_LINE" block="画直线 从 x1 %x1|y1 %y1|到x2 %x2|y2 %y2|颜色 %color"
    //% x1.max=127 x1.min=0 x1.defl=0
    //% y1.max=63 y1.min=0 y1.defl=0
    //% x2.max=128 x2.min=1 x2.defl=16
    //% y2.max=64 y2.min=1 y2.defl=8
    //% color.max=1 color.min=0 color.defl=1
    //% weight=65 blockGap=8 inlineInputMode=inline
    //% group="画图"
    export function line(x1: number, y1: number, x2: number, y2: number, color: number = 1) {
        let _sav = _DRAW
        _DRAW = 0
        let tmp
        if (x1==x2) {
            if (y1>y2) {
                tmp = y2
                y2 = y1
                y1 = tmp;       
             }
            verticalLine(x1, y1, y2-y1+1, 1)
        }  else if (y1==y2) {
            if (x1>x2) {
                tmp = x2
                x2 = x1
                x1 = tmp;       
            }
            horizontalLine(x1, y1, x2-x1+1, 1)
        } else {
            for (let i = x1; i <= x2; i++) {
                let y = y1+(i-x1)*(y2-y1)/(x2-x1)
                pixel(i, y, color)
            }
        }
        _DRAW = _sav
        draw(_DRAW)
    }

    /**
     * 绘制一个长方形，使用颜色 = 1 去绘制，使用颜色 = 0 去清除.
     */
    //% blockId="OLED12864_I2C_RECT" block="画一个长方形 在 x1 %x1|y1 %y1|x2 %x2|y2 %y2|颜色 %color"
    //% color.defl=1
    //% weight=64 blockGap=8 inlineInputMode=inline
    //% group="画图"
    export function rectangle(x1: number, y1: number, x2: number, y2: number, color: number = 1) {
        if (x1 > x2)
            x1 = [x2, x2 = x1][0];
        if (y1 > y2)
            y1 = [y2, y2 = y1][0];
        _DRAW = 0
        horizontalLine(x1, y1, x2 - x1 + 1, color)
        horizontalLine(x1, y2, x2 - x1 + 1, color)
        verticalLine(x1, y1, y2 - y1 + 1, color)
        verticalLine(x2, y1, y2 - y1 + 1, color)
        _DRAW = 1
        draw(1)
    }

    /**
     * 绘制一个圆，使用颜色 = 1 去绘制，使用颜色 = 0 去清除.
     */
    //% blockId="OLED12864_I2C_CIRCLE" block="画一个圆 在 x %x|y %y|半径 %r|颜色 %color"
    //% color.defl=1
    //% weight=63 blockGap=8 inlineInputMode=inline
    //% group="画图"
    export function circle(x1: number, y1: number, r: number, color: number = 1) {
        _DRAW = 0

        let d0, x = 0, y = r;//d0是判别式的值
        d0 = 1 - r;   //判别式的初始值，1.25可以改为1
        while (x < y) 
        {
            if (d0 >= 0) 
            {
                d0 = d0 + 2 * (x - y) + 5;            //d0一定要先比x,y更新
                x += 1;                //因为d0表达式中的x,y是上一个点
                y -= 1;
                pixel(((x + x1)), ((y + y1)), color);         //(x,y)
                pixel(((-x + x1)), ((y + y1)), color);        //(-x,y)
                pixel(((y + x1)), ((x + y1)), color);         //(y,x)
                pixel(((-y + x1)), ((x + y1)), color);        //(-y,x)
                pixel(((x + x1)), ((-y + y1)), color);        //(x,-y)
                pixel(((-x + x1)), ((-y + y1)), color);       //(-x,-y)
                pixel(((y + x1)), ((-x + y1)), color);        //(y,-y)
                pixel(((-y + x1)), ( (-x + y1)), color);       //(-y,-x)
            }
            else 
            {
                d0 = d0 + 2 * x + 3;
                x += 1;
                y = y;
                pixel(((x + x1)), ((y + y1)), color);         //(x,y)
                pixel(((-x + x1)), ((y + y1)), color);        //(-x,y)
                pixel(((y + x1)), ((x + y1)), color);         //(y,x)
                pixel(((-y + x1)), ((x + y1)), color);        //(-y,x)
                pixel(((x + x1)), ((-y + y1)), color);        //(x,-y)
                pixel(((-x + x1)), ((-y + y1)), color);       //(-x,-y)
                pixel(((y + x1)), ((-x + y1)), color);        //(y,-y)
                pixel(((-y + x1)), ((-x + y1)), color);       //(-y,-x)
            }
        }

        _DRAW = 1
        draw(1)
    }

    /**
     * 屏幕内容反向显示
     * @param d true: invert / false: normal, eg: true
     */
    //% blockId="OLED12864_I2C_INVERT" block="反向显示 %d"
    //% weight=59 blockGap=8
    //% group="可选"
    export function invert(d: boolean = true) {
        let n = (d) ? 0xA7 : 0xA6
        cmd1(n)
    }

    /**
     * 清除当前屏幕所有内容
     */
    //% blockId="OLED12864_I2C_CLEAR" block="清除显示屏"
    //% weight=58 blockGap=8
    //% group="可选"
    export function clear() {
        _cx = _cy = 0
        _screen.fill(0)
        _screen[0] = 0x40
        draw(1)
    }


    //% block="设置1倍"
    //% weight=57 blockGap=8
    export function set1X()
    {
        _DOUBLE = 0
    }

    //% block="设置2倍"
    //% weight=56 blockGap=8
    export function set2X()
    {
        _DOUBLE = 1
    }

    //% block="缩小"
    //% weight=55 blockGap=8
    export function zoomOut() {
        _ZOOM = 0
        cmd2(0xd6, _ZOOM)
    }

    //% block="放大"
    //% weight=54 blockGap=8
    export function zoomIn() {
        _ZOOM = 1
       cmd2(0xd6, _ZOOM)
    }

    /**
     *打开/关闭屏幕，默认是显示.
     */
    //% blockId="OLED12864_I2C_ON" block="显示 %on"
    //% on.defl=1
    //% weight=53 blockGap=8
    //% group="可选"
    export function display(on: boolean) {
        if (on)
            cmd1(0xAF);
        else
            cmd1(0xAE);
    }

    /**
     * power up the OD01. OD01 is initialised by default on startup. 
     */
    // % blockId="OLED12864_I2C_init" block="初始化显示屏"
    // % weight=5 blockGap=8
    function init() {
        cmd1(0xAE)       // SSD1306_DISPLAYOFF
        cmd1(0xA4)       // SSD1306_DISPLAYALLON_RESUME
        cmd2(0xD5, 0xF0) // SSD1306_SETDISPLAYCLOCKDIV
        cmd2(0xA8, 0x3F) // SSD1306_SETMULTIPLEX
        cmd2(0xD3, 0x00) // SSD1306_SETDISPLAYOFFSET
        cmd1(0 | 0x0)    // line #SSD1306_SETSTARTLINE
        cmd2(0x8D, 0x14) // SSD1306_CHARGEPUMP
        cmd2(0x20, 0x00) // SSD1306_MEMORYMODE
        cmd3(0x21, 0, 127) // SSD1306_COLUMNADDR
        cmd3(0x22, 0, 63)  // SSD1306_PAGEADDR
        cmd1(0xa0 | 0x1) // SSD1306_SEGREMAP
        cmd1(0xc8)       // SSD1306_COMSCANDEC
        cmd2(0xDA, 0x12) // SSD1306_SETCOMPINS
        cmd2(0x81, 0xCF) // SSD1306_SETCONTRAST
        cmd2(0xd9, 0xF1) // SSD1306_SETPRECHARGE
        cmd2(0xDB, 0x40) // SSD1306_SETVCOMDETECT
        cmd1(0xA6)       // SSD1306_NORMALDISPLAY
        cmd2(0xD6, 0)    // zoom off
        cmd1(0xAF)       // SSD1306_DISPLAYON
        clear()
    }

    init();
} 
