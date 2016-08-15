import {PUT_STATS} from './types';
import {handleActions} from 'redux-actions';

export default handleActions({
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
