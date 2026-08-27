 >>>>>> TOTAL RESULTS

    checks_total.......: 10      17.410532/s
    checks_succeeded...: 100.00% 10 out of 10
    checks_failed......: 0.00%   0 out of 10

    ✓ health returns 200
    ✓ health reports ok
    ✓ concerts returns 200
    ✓ concerts are paginated
    ✓ reserve returns 201
    ✓ a second seat is rejected with 409
    ✓ a USER cannot create a concert
    ✓ invalid payload returns 400
    ✓ validation errors are listed
    ✓ cancel returns 200

    HTTP
    http_req_duration..............: avg=32.46ms  min=5.31ms   med=12.45ms  max=141.74ms p(90)=115.13ms p(95)=128.43ms
      { expected_response:true }...: avg=42.22ms  min=7.67ms   med=14.55ms  max=141.74ms p(90)=123.11ms p(95)=132.42ms
    http_req_failed................: 27.27% 3 out of 11
    http_reqs......................: 11     19.151585/s

    EXECUTION
    iteration_duration.............: avg=279.46ms min=279.46ms med=279.46ms max=279.46ms p(90)=279.46ms p(95)=279.46ms
    iterations.....................: 1      1.741053/s

    NETWORK
    data_received..................: 15 kB  25 kB/s
    data_sent......................: 4.1 kB 7.1 kB/s

running (00m00.6s), 0/1 VUs, 1 complete and 0 interrupted iterations
default ✓ [ 100% ] 1 VUs  00m00.3s/10m0s  1/1 shared iters
time="2026-08-27T16:27:14+07:00" level=error msg="thresholds on metrics 'http_req_failed' have been crossed"

>>>>>> time="2026-08-27T16:27:57+07:00" level=info msg="200 users are about to fight over 10 seats" source=console
time="2026-08-27T16:27:58+07:00" level=info msg="final state: reserved=10 capacity=10 available=0" source=console
    ✓ 'rate==1.0' rate=100.00%
    ✓ 'rate<0.01' rate=0.00%
    overbooked_seats
    ✓ 'count==0' count=0
    seats_reserved
    ✓ 'count==10' count=10
    checks_total.......: 403     17.153859/s
    checks_succeeded...: 100.00% 403 out of 403
    checks_failed......: 0.00%   0 out of 403
    ✓ reservation resolved cleanly (201 or 409)
    ✓ no server error under contention
    ✓ reserved seats never exceed capacity
    ✓ every seat was taken
    ✓ concert reports itself sold out
    overbooked_seats...............: 0      0/s
    seats_rejected.................: 190    8.087427/s
    seats_reserved.................: 10     0.425654/s
everyone_at_once ✓ [ 100% ] 200 VUs  0m00.9s/2m0s  200/200 iters, 1 per VU

>>>>>>> Run k6 run -e SEATS=10 -e USERS=1000
