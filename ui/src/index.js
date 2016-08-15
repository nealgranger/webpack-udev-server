import client from 'socket.io-client';
import {createElement} from 'react';
import {render} from 'react-dom';
import {createStore as storeX, compose, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import {createAction, handleActions} from 'redux-actions';
import {connect, Provider} from 'react-redux';
import map from 'lodash/fp/map';
import values from 'lodash/fp/values';

const PUT_STATS = 'PUT_STATS';
const putStats = createAction(PUT_STATS);

const reducer = handleActions({
  [PUT_STATS]: (state, {payload: stats}) => {
    return {
      ...state,
      stats: {
        ...state.stats,
        [stats.token]: stats,
      },
    };
  },
}, {
  stats: {},
});

const createStore = (initialState) => compose(
  applyMiddleware(thunk)
)(storeX)(reducer, initialState);

const store = createStore();

const Asset = ({name}) => (
  <li>{name}</li>
);

const Assets = ({assets}) => (
  <ul>
    {map((asset) => <Asset {...asset} key={asset.name}/>, assets)}
  </ul>
);

const StatsItem = (({token, hash, assets, publicPath}) => (
  <div>
    webpack {token} - {hash} - {publicPath}
    <Assets assets={assets}/>
  </div>
));

const List = (({stats}) => {
  return (
    <div>
      {map((props) => <StatsItem {...props} key={props.token}/>, stats)}
    </div>
  );
});

const ConnectedList = connect(({stats}) => {
  return {stats: values(stats)};
})(List);

const Root = ({store}) => (
  <Provider store={store}><div><ConnectedList/></div></Provider>
);

const element = document.getElementById('main');
render(<Root store={store}/>, element);

const io = client(process.env.IPC_URL);

io.emit('watch-stats');

io.on('stats', (stats) => {
  store.dispatch(putStats(stats));
});
