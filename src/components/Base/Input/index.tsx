import React from 'react';
import {TextInput} from 'react-native-paper';

type InputProps = React.ComponentProps<typeof TextInput>;

const Input = (props: InputProps) => <TextInput mode="outlined" {...props} />;

export default Input;
