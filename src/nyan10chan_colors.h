/* Material-aware terminal palettes. RGB source, xterm index, ANSI index.
 * Keep dark outlines separate from hair, warm skin separate from jacket,
 * and all six smoke bands distinct. ANSI colors follow the user's theme.
 */
static const unsigned char terminal_colors[][5] = {
    {  0, 57,105, 25, 4}, /* sky: blue, never nearest-color teal */
    { 11, 16, 27,232, 0}, /* outline */
    { 34, 13, 36,233, 0}, /* hair: darkest to lightest */
    { 54, 11, 44,234, 0},
    { 75, 16, 54, 53, 1},
    {101, 30, 69, 53, 1},
    {255,227,210,224,15}, /* 16-color skin stays flat white, like the alternate artwork */
    {245,201,184,223,15},
    {216,164,145,180,15},
    {153,107, 96,138,15},
    { 57, 39, 40,235, 0}, /* jacket seams and three warm steps */
    { 81, 54, 46,236, 0},
    {107, 72, 59, 59, 1},
    {128, 90, 73, 95, 1},
    { 16, 28, 50,233, 0}, /* navy suit */
    { 27, 41, 64,234, 4},
    { 46, 60, 84, 60,12},
    { 71, 89,116, 60,12}, /* metal */
    {103,126,153, 67, 7},
    {149,171,192,110,15},
    { 62, 76, 78,239, 8}, /* iris: neutral gray, not cyan */
    {100,115,114,244, 8},
    {161,178,172,249, 7},
    {244,255,255,231,15}, /* eye whites and chest stripe */
    {255, 30, 44,196, 9}, /* rainbow: red, ochre/orange, yellow, green, cyan, purple */
    {255,153,  0,208, 3},
    {255,237, 48,226,11},
    { 63,237, 34, 46,10},
    {  0,176,243, 45,14},
    {113, 57,249, 93,13},
    {238,255,255,231,15}  /* stars */
};
static const unsigned char ansi16[][3] = {
    {0,0,0},{128,0,0},{0,128,0},{128,128,0},{0,0,128},{128,0,128},{0,128,128},{192,192,192},
    {128,128,128},{255,0,0},{0,255,0},{255,255,0},{0,0,255},{255,0,255},{0,255,255},{255,255,255}
};
/* Sprite-local bounds: front canards, rear head fin, left/right main wings.
 * In 16 colors, shared flat paint with a few hand-placed accents on metal only.
 */
static const unsigned char wing_regions[][4] = {
    {22,8,43,25}, {65,22,79,44}, {10,45,29,59}, {46,55,69,74}
};
/* Base, highlight, shadow. */
static const unsigned char wing_inks[] = {12,8,4};
static const unsigned char wing_materials[] = {16,17,18,19};
/* x, y, ink; checked against all six poses. No tiled surface texture. */
static const unsigned char wing_accents[][3] = {
    {35,10,1}, {27,15,1}, {28,15,1}, {30,19,2},
    {69,29,1}, {71,34,2},
    {16,48,1}, {17,48,1}, {21,51,2},
    {48,60,1}, {49,60,1}, {51,65,2}
};
