/**
 * Copyright 2020 CriticalBlue Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

const ShapeView = (props) => {
  const imgSrc = {
    'logo': require('./assets/approov_largelogo.png'),
    'hello': require('./assets/hello.png'),
    'confused': require('./assets/confused.png'),
    'Rectangle': require('./assets/rectangle.png'),
    'Square': require('./assets/square.png'),
    'Triangle': require('./assets/triangle.png'),
    'Circle': require('./assets/circle.png'),
  };
  
  return (
    <View style={props.style}>
      <Image source={imgSrc[props.shape]} style={styles.shapeImg} />
      <Text style={{fontSize: 24, marginTop: 10}}>{props.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shapeImg: {
      resizeMode: 'contain',
      height: 256,
      width: 256,
  }
});

export default ShapeView;