import React from 'react';
import {StyleSheet} from 'react-native';
import ToastMessage, {
  BaseToast,
  BaseToastProps,
  ToastConfig,
} from 'react-native-toast-message';

import {TipoToast} from '../../../infra/implementations/toast';
import {TemaApp, useAppTheme} from '../../../theme';

type ToastTematicoProps = BaseToastProps & {
  cor: string;
};

const ToastTematico = ({cor, ...rest}: ToastTematicoProps) => (
  <BaseToast
    {...rest}
    style={[styles.toast, {borderLeftColor: cor}]}
    contentContainerStyle={styles.conteudo}
    text1Style={styles.titulo}
    text2Style={styles.descricao}
    text1NumberOfLines={2}
    text2NumberOfLines={3}
  />
);

const criarToast = (obterCor: (tema: TemaApp) => string) => {
  const Toast = (props: BaseToastProps) => {
    const tema = useAppTheme();

    return <ToastTematico {...props} cor={obterCor(tema)} />;
  };

  return Toast;
};

const ToastSucesso = criarToast(tema => tema.colors.success);
const ToastErro = criarToast(tema => tema.colors.error);
const ToastAviso = criarToast(tema => tema.colors.warning);
const ToastInfo = criarToast(tema => tema.colors.info);

const config: ToastConfig = {
  [TipoToast.SUCESSO]: props => <ToastSucesso {...props} />,
  [TipoToast.ERRO]: props => <ToastErro {...props} />,
  [TipoToast.AVISO]: props => <ToastAviso {...props} />,
  [TipoToast.INFO]: props => <ToastInfo {...props} />,
};

const Toasts = () => <ToastMessage config={config} topOffset={56} />;

const styles = StyleSheet.create({
  toast: {
    borderLeftWidth: 6,
    borderRadius: 8,
    height: 'auto',
    minHeight: 64,
    paddingVertical: 12,
  },
  conteudo: {
    paddingHorizontal: 16,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '600',
  },
  descricao: {
    fontSize: 13,
    fontWeight: '400',
  },
});

export default Toasts;
