"""Synthetic regional clustering and held-out model inspection. No client data.
Requires NumPy and scikit-learn. Output is a static, reproducible demo artifact.
"""
from pathlib import Path
import json
import numpy as np
import sklearn
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, silhouette_score
ROOT=Path(__file__).resolve().parents[1]
SEED=907221
rng=np.random.default_rng(SEED)
features=[
 ('land_field','토지_전','%','전체 토지 면적 중 지목 전 면적 비율','지목별 면적 / 지역 면적'),
 ('land_paddy','토지_답','%','전체 토지 면적 중 지목 답 면적 비율','지목별 면적 / 지역 면적'),
 ('land_residential','토지_대','%','전체 토지 면적 중 지목 대 면적 비율','지목별 면적 / 지역 면적'),
 ('aging_index','노령화지수','명/100명','유소년 100명당 65세 이상 인구','65세 이상 / 0–14세 × 100'),
 ('elderly','고령인구 비율','%','65세 이상 인구 비중','65세 이상 / 전체 인구'),
 ('old_buildings','노후 건물 비율','%','사용승인 후 30년 이상 건물 비중','30년 이상 건물 / 주거용 건물'),
 ('detached','단독주택 비율','%','주거용 건물 중 단독주택 비중','단독주택 / 주거용 건물'),
 ('population_change','5년 인구 증감률','%','5년 전 대비 주민 수 변화','(현재 / 5년 전 − 1) × 100'),
 ('low_electric','전기 저사용 비율','%','계량기 연결이 확인된 저사용 주택 비중','저사용 주택 / 연결 유효 주택 · 예시 규칙'),
 ('low_water','상수도 저사용 비율','%','계량기 연결이 확인된 저사용 주택 비중','저사용 주택 / 연결 유효 주택 · 예시 규칙'),
 ('transit_distance','대중교통 접근거리','m','주거지에서 정류장까지 평균 거리','접근 경로 거리 평균'),
 ('amenity_distance','생활시설 접근거리','m','주거지에서 생활시설까지 평균 거리','생활시설 최단 경로 거리 평균'),
 ('land_price','평균 지가','만원/㎡','대상 지역 필지의 면적 가중 평균 지가','면적 가중 평균'),
 ('turnover','주택 거래회전율','%','주택 재고 대비 연간 거래 비중','연간 거래 주택 / 주택 재고'),
 ('no_road','도로 접면 미확보 비율','%','접면 조건을 충족하지 못한 주거 필지 비중','미확보 주거 필지 / 주거 필지'),
 ('slope','평균 경사도','°','주거 필지의 평균 경사','주거 필지 경사 평균'),
 ('renewal','정비구역 포함 비율','%','정비구역 안의 주거 필지 비중','정비구역 교차 면적 / 주거 필지 면적'),
 ('small_parcel','소형 필지 비율','%','예시 면적 기준 미만 주거 필지 비중','150㎡ 미만 주거 필지 / 주거 필지 · 예시 기준'),
 ('single_household','1인 가구 비율','%','전체 가구 중 1인 가구 비중','1인 가구 / 전체 가구'),
 ('business_density','사업체 밀도','개/㎢','지역 면적당 사업체 수','사업체 수 / 지역 면적'),
]
centres=np.array([
 [40,23,8,380,36,45,85,-14,14,12,1050,2100,5,1.8,14,8,2,14,32,10],
 [3,2,63,210,26,62,62,-8,11,10,220,380,120,3.4,9,3,18,48,42,260],
 [16,12,30,120,18,24,46,3,6,5,610,1050,42,6.4,5,5,5,21,28,60],
])
scales=np.array([7,6,8,80,5,12,9,5,4,4,240,440,25,1.5,4,3,6,9,7,28])
n=600;regime=np.repeat(np.arange(3),n//3)
X=np.clip(centres[regime]+rng.normal(size=(n,len(features)))*scales,0,None)
X[:,7]=centres[regime,7]+rng.normal(0,5,n)
X[:,:3]*=np.minimum(1,95/X[:,:3].sum(axis=1))[:,None]
for j,f in enumerate(features):
 if f[2]=='%' and j!=7:X[:,j]=np.clip(X[:,j],0,98)
# Distinct feature relationships across regional regimes, plus unexplained variation.
y=2 + .09*X[:,5]+.13*X[:,8]+.08*X[:,9]-.06*X[:,7]-.16*X[:,13]
y+=np.where(regime==0,.012*X[:,3]+.055*X[:,0]+.12*X[:,14],0)
y+=np.where(regime==1,.045*X[:,17]+.05*X[:,16]+.07*X[:,18],0)
y+=np.where(regime==2,.002*X[:,11]+.08*X[:,14]+.05*X[:,6],0)
y=np.clip(y+rng.normal(0,.65,n),.3,35)
train,test=train_test_split(np.arange(n),test_size=.25,stratify=regime,random_state=SEED)
cluster_features=[0,3,5,6,7,10,12,19]
scaler=StandardScaler().fit(X[train][:,cluster_features]);Z=scaler.transform(X[:,cluster_features])
kmeans=KMeans(n_clusters=3,n_init=20,random_state=SEED).fit(Z[train]);raw=kmeans.predict(Z)
# Human-readable type labels describe fitted centres, not input labels.
cent=np.array([X[train[raw[train]==i]].mean(axis=0) for i in range(3)])
rural=int(cent[:,0].argmax());urban=int(cent[:,19].argmax());outer=({0,1,2}-{rural,urban}).pop()
order=[rural,urban,outer];cluster=np.array([order.index(int(c)) for c in raw])
model=RandomForestRegressor(n_estimators=180,min_samples_leaf=3,max_features=.9,random_state=SEED,n_jobs=2).fit(X[train],y[train]);pred=model.predict(X)
regions=[]
for i in range(n):
 regions.append({'id':f'RG-{i+1:03d}','name':f'{["해솔","중앙","서림"][cluster[i]]} {i%200+1:03d}구역','cluster':int(cluster[i]),'split':'test' if i in set(test) else 'train','observed':round(float(y[i]),3),'prediction':round(float(pred[i]),3),'values':np.round(X[i],3).tolist()})
clusters=[]
for c,(name,desc) in enumerate(zip(['농촌·고령화형','구도심·노후주거형','외곽·저밀주거형'],['농지 비중·고령화·생활시설 접근성을 함께 확인합니다.','노후 주거·소형 필지·정비구역 포함 여부를 함께 봅니다.','저밀 주거·교통 접근·인구 변화의 차이를 확인합니다.'])):
 idx=np.where(cluster==c)[0];ti=test[cluster[test]==c]
 imp=permutation_importance(model,X[ti],y[ti],scoring='neg_mean_absolute_error',n_repeats=12,random_state=SEED+c,n_jobs=2)
 ranks=np.argsort(-imp.importances_mean)
 effects=[]
 for j in range(len(features)):
  edges=np.quantile(X[idx,j],[0,.2,.4,.6,.8,1]);bins=[]
  for b in range(5):
   bi=idx[(X[idx,j]>=edges[b])&(X[idx,j]<=edges[b+1] if b==4 else X[idx,j]<edges[b+1])]
   bins.append({'lo':round(float(edges[b]),2),'hi':round(float(edges[b+1]),2),'n':len(bi),'observed':round(float(y[bi].mean()),3) if len(bi) else None,'predicted':round(float(pred[bi].mean()),3) if len(bi) else None})
  effects.append(bins)
 clusters.append({'id':c,'name':name,'desc':desc,'n':len(idx),'testN':len(ti),'mae':round(float(mean_absolute_error(y[ti],pred[ti])),4),'rate':round(float(y[idx].mean()),3),'predictedRate':round(float(pred[idx].mean()),3),'medians':np.round(np.median(X[idx],axis=0),3).tolist(),'importance':[{'feature':int(j),'mean':round(float(imp.importances_mean[j]),5),'std':round(float(imp.importances_std[j]),5)} for j in ranks[:10]],'effects':effects})
output={'seed':SEED,'sklearn':sklearn.__version__,'n':n,'trainN':len(train),'testN':len(test),'features':[{'key':k,'name':name,'unit':unit,'definition':definition,'formula':formula} for k,name,unit,definition,formula in features],'clusterFeatures':cluster_features,'allMedians':np.round(np.median(X,axis=0),3).tolist(),'mae':round(float(mean_absolute_error(y[test],pred[test])),4),'silhouette':round(float(silhouette_score(Z[test],cluster[test])),3),'clusters':clusters,'regions':regions}
(ROOT/'assets/js/vacancy-regions.mjs').write_text('// Entirely synthetic regions; fitted clustering, predictions and held-out permutation importance.\nexport const VACANCY = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Wrote {n} synthetic regions, {len(features)} features, 3 fitted clusters; holdout MAE {output["mae"]} pp')
print([(c['name'],c['n'],[features[f['feature']][1] for f in c['importance'][:3]]) for c in clusters])
