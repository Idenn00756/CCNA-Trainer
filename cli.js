/* Тренажёр CCNA · задачи на ввод команд IOS
   steps: [приглашение, шаблон, эталонная команда]. Ввод сравнивается без учёта регистра
   и лишних пробелов; сокращения IOS (int, sw, no shut, sh ip int br) принимаются. */
(function(){
  const x=s=>s.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");
  // ab("switchport",2) → «sw», «swi», … «switchport»
  const ab=(w,m)=>{let r="";for(let i=w.length-1;i>=m;i--)r="(?:"+x(w[i])+r+")?";return x(w.slice(0,m))+r;};
  const R=(...p)=>new RegExp("^"+p.join("\\s+")+"$");
  const INT=ab("interface",3);
  const GI=n=>"(?:g|gi|gig|gigabitethernet)\\s*"+x(n);
  const FA=n=>"(?:f|fa|fastethernet)\\s*"+x(n);
  const SW=ab("switchport",2), NO="no", SH=ab("show",2), IP="ip";

  window.CLI=[
  /* ── Основы (дни 4–10) ── */
  {id:"k01",b:0,day:4,t:"Задайте устройству имя SW1 и защитите привилегированный режим (privileged EXEC) хешированным паролем cisco.",
   steps:[["Switch(config)#",R(ab("hostname",4),"sw1"),"hostname SW1"],
          ["SW1(config)#",R(ab("enable",2),ab("secret",3),"cisco"),"enable secret cisco"]],
   why:"<code>enable secret</code> хранит пароль хешем, в отличие от <code>enable password</code>. Приглашение сразу меняется на новое имя."},

  {id:"k02",b:0,day:4,t:"Защитите консольный порт (console) паролем ccna и включите шифрование паролей в конфигурации.",
   steps:[["SW1(config)#",R("line",ab("console",3),"0"),"line console 0"],
          ["SW1(config-line)#",R(ab("password",4),"ccna"),"password ccna"],
          ["SW1(config-line)#",R("login"),"login"],
          ["SW1(config-line)#",R(ab("service",4),ab("password-encryption",10)),"service password-encryption"]],
   why:"Без <code>login</code> пароль на линии не запрашивается. <code>service password-encryption</code> прячет пароли слабым шифром типа 7 — это защита от чтения через плечо, а не от взлома."},

  {id:"k03",b:0,day:4,t:"Выйдите из режима конфигурации и сохраните текущую конфигурацию в загрузочную (startup-config).",
   steps:[["SW1(config)#",R("(?:end|exit)"),"end"],
          ["SW1#",/^(?:copy\s+run(?:n(?:i(?:n(?:g(?:-(?:c(?:o(?:n(?:f(?:i(?:g)?)?)?)?)?)?)?)?)?)?)?\s+start(?:u(?:p(?:-(?:c(?:o(?:n(?:f(?:i(?:g)?)?)?)?)?)?)?)?)?|wr(?:i(?:t(?:e)?)?)?(?:\s+mem(?:o(?:r(?:y)?)?)?)?)$/,"copy running-config startup-config"]],
   why:"Подойдёт и короткое <code>write memory</code> (<code>wr</code>). Без сохранения всё введённое пропадёт после перезагрузки."},

  {id:"k04",b:0,day:6,t:"Посмотрите таблицу MAC-адресов коммутатора.",
   steps:[["SW1#",R(SH,"mac",ab("address-table",3)),"show mac address-table"]],
   why:"В выводе видно VLAN, MAC, тип записи (DYNAMIC или STATIC) и порт. Динамические записи по умолчанию стираются через 300 секунд бездействия."},

  {id:"k05",b:0,day:8,t:"Назначьте интерфейсу Gi0/0 маршрутизатора R1 адрес 192.168.1.1/24 и включите интерфейс.",
   steps:[["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R(IP,ab("address",3),x("192.168.1.1"),x("255.255.255.0")),"ip address 192.168.1.1 255.255.255.0"],
          ["R1(config-if)#",R(NO,ab("shutdown",4)),"no shutdown"]],
   why:"Интерфейсы маршрутизатора по умолчанию административно выключены — без <code>no shutdown</code> адрес назначен, но интерфейс не работает. Маска вводится в десятичном виде, префикс /24 IOS не принимает."},

  {id:"k06",b:0,day:8,t:"Выведите краткую сводку интерфейсов с IP-адресами и состоянием.",
   steps:[["R1#",R(SH,IP,INT,ab("brief",2)),"show ip interface brief"]],
   why:"Самая частая команда диагностики: столбцы Status (физический и административный уровень) и Protocol (канальный) сразу показывают, где проблема."},

  {id:"k07",b:0,day:9,t:"На SW1 задайте порту Fa0/1 описание TO-PC1, скорость 100 Мбит/с и полный дуплекс.",
   steps:[["SW1(config)#",R(INT,FA("0/1")),"interface f0/1"],
          ["SW1(config-if)#",R(ab("description",4),"to-pc1"),"description TO-PC1"],
          ["SW1(config-if)#",R("speed","100"),"speed 100"],
          ["SW1(config-if)#",R(ab("duplex",3),"full"),"duplex full"]],
   why:"Если зафиксировать скорость и дуплекс только с одной стороны, вторая откатится в полудуплекс — получится duplex mismatch. Меняйте настройки на обоих концах."},

  /* ── Подсети и маршруты (дни 11–15) ── */
  {id:"k08",b:1,day:11,t:"На R1 добавьте маршрут к сети 10.0.3.0/24 через 10.0.12.2 и маршрут по умолчанию через 203.0.113.1.",
   steps:[["R1(config)#",R(IP,"route",x("10.0.3.0"),x("255.255.255.0"),x("10.0.12.2")),"ip route 10.0.3.0 255.255.255.0 10.0.12.2"],
          ["R1(config)#",R(IP,"route",x("0.0.0.0"),x("0.0.0.0"),x("203.0.113.1")),"ip route 0.0.0.0 0.0.0.0 203.0.113.1"]],
   why:"Порядок аргументов: сеть, маска, следующий переход. В таблице маршрутизации маршрут по умолчанию появится как <code>S*</code> и строка Gateway of last resort."},

  {id:"k09",b:1,day:11,t:"Создайте плавающий статический маршрут по умолчанию (floating static) через 10.1.1.2 с административной дистанцией 200.",
   steps:[["R1(config)#",R(IP,"route",x("0.0.0.0"),x("0.0.0.0"),x("10.1.1.2"),"200"),"ip route 0.0.0.0 0.0.0.0 10.1.1.2 200"]],
   why:"Последнее число — AD. Маршрут не попадёт в таблицу, пока существует основной маршрут с меньшей дистанцией."},

  {id:"k10",b:1,day:11,t:"Покажите таблицу маршрутизации.",
   steps:[["R1#",R(SH,IP,ab("route",2)),"show ip route"]],
   why:"Коды слева: C — подключённая сеть, L — локальный адрес /32, S — статический, O — OSPF. В скобках [AD/метрика]."},

  /* ── VLAN, STP, EtherChannel (дни 16–23) ── */
  {id:"k11",b:2,day:16,t:"Создайте VLAN 20 с именем SALES и сделайте порт Gi0/5 портом доступа в этой VLAN.",
   steps:[["SW1(config)#",R("vlan","20"),"vlan 20"],
          ["SW1(config-vlan)#",R("name","sales"),"name SALES"],
          ["SW1(config-vlan)#",R(INT,GI("0/5")),"interface g0/5"],
          ["SW1(config-if)#",R(SW,"mode",ab("access",3)),"switchport mode access"],
          ["SW1(config-if)#",R(SW,ab("access",3),"vlan","20"),"switchport access vlan 20"]],
   why:"Из режима конфигурации VLAN можно сразу перейти к интерфейсу. Режим <code>mode access</code> отключает DTP, чтобы порт не стал транком."},

  {id:"k12",b:2,day:17,t:"Настройте Gi0/1 как транк с native VLAN 99 и разрешите только VLAN 10, 20 и 99.",
   steps:[["SW1(config)#",R(INT,GI("0/1")),"interface g0/1"],
          ["SW1(config-if)#",R(SW,"mode",ab("trunk",2)),"switchport mode trunk"],
          ["SW1(config-if)#",R(SW,ab("trunk",2),ab("native",3),"vlan","99"),"switchport trunk native vlan 99"],
          ["SW1(config-if)#",R(SW,ab("trunk",2),ab("allowed",2),"vlan","10,\\s*20,\\s*99"),"switchport trunk allowed vlan 10,20,99"]],
   why:"На коммутаторах с поддержкой L3 перед <code>mode trunk</code> может понадобиться <code>switchport trunk encapsulation dot1q</code>. Native VLAN должна совпадать на обоих концах."},

  {id:"k13",b:2,day:18,t:"На R1 создайте подынтерфейс Gi0/0.10 для VLAN 10 со шлюзом 192.168.10.1/24 (router-on-a-stick).",
   steps:[["R1(config)#",R(INT,GI("0/0.10")),"interface g0/0.10"],
          ["R1(config-subif)#",R(ab("encapsulation",3),"dot1q","10"),"encapsulation dot1Q 10"],
          ["R1(config-subif)#",R(IP,ab("address",3),x("192.168.10.1"),x("255.255.255.0")),"ip address 192.168.10.1 255.255.255.0"]],
   why:"Номер подынтерфейса удобно делать равным VLAN, но связь задаёт именно <code>encapsulation dot1Q</code>. Сам физический Gi0/0 нужно включить через <code>no shutdown</code>."},

  {id:"k14",b:2,day:20,t:"Сделайте SW1 корневым мостом для VLAN 10: приоритетом 24576 или макрокомандой root primary.",
   steps:[["SW1(config)#",/^spanning-tree\s+vlan\s+10\s+(?:pri(?:o(?:r(?:i(?:t(?:y)?)?)?)?)?\s+(?:0|4096|8192|12288|16384|20480|24576)|root\s+primary)$/,"spanning-tree vlan 10 priority 24576"]],
   why:"<code>root primary</code> ставит 24576 или на 4096 меньше текущего корня. Явный приоритет надёжнее: макрос срабатывает один раз и не следит за новыми коммутаторами."},

  {id:"k15",b:2,day:22,t:"На порту доступа Gi0/3 включите PortFast и BPDU Guard.",
   steps:[["SW1(config)#",R(INT,GI("0/3")),"interface g0/3"],
          ["SW1(config-if)#",R("spanning-tree","portfast"),"spanning-tree portfast"],
          ["SW1(config-if)#",R("spanning-tree","bpduguard",ab("enable",2)),"spanning-tree bpduguard enable"]],
   why:"PortFast даёт хосту связь сразу, BPDU Guard уводит порт в err-disabled, если туда подключат коммутатор. Глобально: <code>spanning-tree portfast default</code> и <code>spanning-tree portfast bpduguard default</code>."},

  {id:"k16",b:2,day:23,t:"Объедините Gi0/1 и Gi0/2 в EtherChannel 1 по LACP с активным согласованием.",
   steps:[["SW1(config)#",/^int(?:e(?:r(?:f(?:a(?:c(?:e)?)?)?)?)?)?\s+range\s+(?:g|gi|gig|gigabitethernet)\s*0\/1\s*-\s*(?:(?:g|gi|gig|gigabitethernet)\s*0\/)?2$/,"interface range g0/1 - 2"],
          ["SW1(config-if-range)#",R("channel-group","1","mode","active"),"channel-group 1 mode active"]],
   why:"<code>active</code> — LACP, инициирует согласование; <code>desirable</code> — PAgP; <code>on</code> — без протокола. Логический интерфейс Port-channel1 создастся автоматически."},

  /* ── Динамическая маршрутизация (дни 24–29) ── */
  {id:"k17",b:3,day:26,t:"Запустите OSPF процесс 1 с Router ID 1.1.1.1 и включите в area 0 сеть 10.0.12.0/30.",
   steps:[["R1(config)#",R("router","ospf","1"),"router ospf 1"],
          ["R1(config-router)#",R("router-id",x("1.1.1.1")),"router-id 1.1.1.1"],
          ["R1(config-router)#",R(ab("network",3),x("10.0.12.0"),x("0.0.0.3"),"area","0"),"network 10.0.12.0 0.0.0.3 area 0"]],
   why:"В команде <code>network</code> используется обратная маска: для /30 это 0.0.0.3. Номер процесса локален и может не совпадать у соседей, а номер area — обязан."},

  {id:"k18",b:3,day:28,t:"В процессе OSPF 1 сделайте интерфейс Gi0/1 пассивным.",
   steps:[["R1(config)#",R("router","ospf","1"),"router ospf 1"],
          ["R1(config-router)#",R("passive-interface",GI("0/1")),"passive-interface g0/1"]],
   why:"Сеть Gi0/1 продолжит анонсироваться, но Hello туда уходить не будут — ни лишних соседей, ни раскрытия топологии в пользовательский сегмент."},

  {id:"k19",b:3,day:29,t:"На Gi0/0 маршрутизатора R1 настройте HSRP группу 1: виртуальный IP 10.1.1.1, приоритет 110 и вытеснение (preempt).",
   steps:[["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R("standby","1","ip",x("10.1.1.1")),"standby 1 ip 10.1.1.1"],
          ["R1(config-if)#",R("standby","1",ab("priority",3),"110"),"standby 1 priority 110"],
          ["R1(config-if)#",R("standby","1",ab("preempt",3)),"standby 1 preempt"]],
   why:"Без <code>preempt</code> R1 с приоритетом 110 после перезагрузки не заберёт роль active обратно. Проверка — <code>show standby brief</code>."},

  /* ── IPv6 (дни 31–33) ── */
  {id:"k20",b:4,day:33,t:"Включите маршрутизацию IPv6 и назначьте Gi0/0 адрес 2001:db8:1::1/64.",
   steps:[["R1(config)#",R("ipv6",ab("unicast-routing",3)),"ipv6 unicast-routing"],
          ["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R("ipv6",ab("address",3),x("2001:db8:1::1/64")),"ipv6 address 2001:db8:1::1/64"]],
   why:"Без <code>ipv6 unicast-routing</code> маршрутизатор ведёт себя как хост: не пересылает IPv6 и не рассылает RA. В IPv6 длина префикса пишется прямо через «/»."},

  /* ── ACL и IP-сервисы (дни 34–47) ── */
  {id:"k21",b:5,day:34,t:"Стандартным ACL 10 запретите хост 192.168.1.50, разрешите всё остальное и примените список на Gi0/1 на выход.",
   steps:[["R1(config)#",new RegExp("^access-list\\s+10\\s+deny\\s+(?:host\\s+"+x("192.168.1.50")+"|"+x("192.168.1.50")+"(?:\\s+"+x("0.0.0.0")+")?)$"),"access-list 10 deny host 192.168.1.50"],
          ["R1(config)#",R("access-list","10",ab("permit",3),"any"),"access-list 10 permit any"],
          ["R1(config)#",R(INT,GI("0/1")),"interface g0/1"],
          ["R1(config-if)#",R(IP,"access-group","10","out"),"ip access-group 10 out"]],
   why:"Без <code>permit any</code> неявный запрет в конце заблокирует вообще весь трафик. Порядок записей важен: список проверяется сверху вниз до первого совпадения."},

  {id:"k22",b:5,day:35,t:"Расширенным ACL 100 разрешите HTTP из сети 10.1.1.0/24 к хосту 192.168.5.10 и примените его на Gi0/0 на вход.",
   steps:[["R1(config)#",new RegExp("^access-list\\s+100\\s+permit\\s+tcp\\s+"+x("10.1.1.0")+"\\s+"+x("0.0.0.255")+"\\s+host\\s+"+x("192.168.5.10")+"\\s+eq\\s+(?:80|www)$"),"access-list 100 permit tcp 10.1.1.0 0.0.0.255 host 192.168.5.10 eq 80"],
          ["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R(IP,"access-group","100","in"),"ip access-group 100 in"]],
   why:"Расширенный список ставят ближе к источнику. Всё, что не HTTP к этому серверу, заблокирует неявный deny."},

  {id:"k23",b:5,day:36,t:"Включите LLDP глобально и отключите CDP на интерфейсе Gi0/1.",
   steps:[["SW1(config)#",R("lldp","run"),"lldp run"],
          ["SW1(config)#",R(INT,GI("0/1")),"interface g0/1"],
          ["SW1(config-if)#",R(NO,"cdp",ab("enable",2)),"no cdp enable"]],
   why:"CDP на порту в сторону чужой сети раскрывает модель и версию IOS. Глобально CDP выключается командой <code>no cdp run</code>."},

  {id:"k24",b:5,day:37,t:"Настройте синхронизацию времени с NTP-сервером 10.1.1.100.",
   steps:[["R1(config)#",R("ntp",ab("server",3),x("10.1.1.100")),"ntp server 10.1.1.100"]],
   why:"Точное время нужно для журналов, сертификатов и корреляции событий. Проверка — <code>show ntp associations</code>."},

  {id:"k25",b:5,day:39,t:"Создайте DHCP-пул LAN для сети 192.168.1.0/24: исключите адреса .1–.10, шлюз 192.168.1.1, DNS 8.8.8.8.",
   steps:[["R1(config)#",R(IP,"dhcp",ab("excluded-address",3),x("192.168.1.1"),x("192.168.1.10")),"ip dhcp excluded-address 192.168.1.1 192.168.1.10"],
          ["R1(config)#",R(IP,"dhcp","pool","lan"),"ip dhcp pool LAN"],
          ["R1(dhcp-config)#",new RegExp("^net(?:w(?:o(?:r(?:k)?)?)?)?\\s+"+x("192.168.1.0")+"\\s+(?:"+x("255.255.255.0")+"|\\/24)$"),"network 192.168.1.0 255.255.255.0"],
          ["R1(dhcp-config)#",R(ab("default-router",3),x("192.168.1.1")),"default-router 192.168.1.1"],
          ["R1(dhcp-config)#",R(ab("dns-server",3),x("8.8.8.8")),"dns-server 8.8.8.8"]],
   why:"Исключения задаются в глобальном режиме, до или после пула. Шлюз обязательно исключают — иначе DHCP может выдать его адрес клиенту."},

  {id:"k26",b:5,day:39,t:"Сделайте R1 ретранслятором DHCP (relay) для клиентов за Gi0/0, сервер — 10.10.10.5.",
   steps:[["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R(IP,ab("helper-address",3),x("10.10.10.5")),"ip helper-address 10.10.10.5"]],
   why:"Команда ставится на интерфейс, куда приходят широковещательные Discover от клиентов, а не на интерфейс в сторону сервера."},

  {id:"k27",b:5,day:41,t:"Отправляйте syslog на сервер 10.1.1.200, передавая сообщения уровня warning и важнее.",
   steps:[["R1(config)#",R(ab("logging",3),"host",x("10.1.1.200")),"logging host 10.1.1.200"],
          ["R1(config)#",R(ab("logging",3),"trap","(?:warnings|4)"),"logging trap warnings"]],
   why:"<code>trap warnings</code> (или 4) пропустит уровни 0–4. Уровень выбирается «этот и всё серьёзнее»."},

  {id:"k28",b:5,day:42,t:"Подготовьте SW1 к доступу по SSH: домен ccna.lab, ключи RSA, пользователь admin с паролем cisco, линии VTY 0–15 только по SSH с локальной аутентификацией.",
   steps:[["SW1(config)#",new RegExp("^ip\\s+domain(?:-name|\\s+name)\\s+"+x("ccna.lab")+"$"),"ip domain-name ccna.lab"],
          ["SW1(config)#",/^crypto\s+key\s+gen(?:e(?:r(?:a(?:t(?:e)?)?)?)?)?\s+rsa(?:\s+(?:general-keys\s+)?modulus\s+\d{3,4})?$/,"crypto key generate rsa modulus 2048"],
          ["SW1(config)#",R(ab("username",4),"admin",ab("secret",3),"cisco"),"username admin secret cisco"],
          ["SW1(config)#",R("line","vty","0","(?:15|4)"),"line vty 0 15"],
          ["SW1(config-line)#",R("login","local"),"login local"],
          ["SW1(config-line)#",R(ab("transport",4),ab("input",2),"ssh"),"transport input ssh"]],
   why:"Для SSH версии 2 нужен ключ не короче 768 бит; обычно берут 2048. <code>login local</code> проверяет локальную базу пользователей, а <code>transport input ssh</code> отключает Telnet."},

  {id:"k29",b:5,day:44,t:"Настройте статический NAT: Gi0/0 — inside, Gi0/1 — outside, сервер 10.1.1.10 доступен снаружи как 203.0.113.10.",
   steps:[["R1(config)#",R(INT,GI("0/0")),"interface g0/0"],
          ["R1(config-if)#",R(IP,"nat","inside"),"ip nat inside"],
          ["R1(config-if)#",R(INT,GI("0/1")),"interface g0/1"],
          ["R1(config-if)#",R(IP,"nat","outside"),"ip nat outside"],
          ["R1(config-if)#",R(IP,"nat","inside","source","static",x("10.1.1.10"),x("203.0.113.10")),"ip nat inside source static 10.1.1.10 203.0.113.10"]],
   why:"Первым в правиле идёт inside local, вторым — inside global. Проверка — <code>show ip nat translations</code>."},

  {id:"k30",b:5,day:45,t:"Настройте PAT: сеть 10.1.1.0/24 (ACL 1) выходит в Интернет через адрес интерфейса Gi0/1.",
   steps:[["R1(config)#",R("access-list","1",ab("permit",3),x("10.1.1.0"),x("0.0.0.255")),"access-list 1 permit 10.1.1.0 0.0.0.255"],
          ["R1(config)#",R(IP,"nat","inside","source","list","1",INT,GI("0/1"),"overload"),"ip nat inside source list 1 interface g0/1 overload"]],
   why:"Слово <code>overload</code> превращает динамический NAT в PAT. Интерфейсы inside и outside должны быть уже размечены."},

  {id:"k31",b:5,day:46,t:"На порту Gi0/4 с IP-телефоном: режим access, данные в VLAN 10, голос в VLAN 150.",
   steps:[["SW1(config)#",R(INT,GI("0/4")),"interface g0/4"],
          ["SW1(config-if)#",R(SW,"mode",ab("access",3)),"switchport mode access"],
          ["SW1(config-if)#",R(SW,ab("access",3),"vlan","10"),"switchport access vlan 10"],
          ["SW1(config-if)#",R(SW,"voice","vlan","150"),"switchport voice vlan 150"]],
   why:"ПК за телефоном остаётся в VLAN 10 без тега, телефон тегирует голос VLAN 150. Коммутатор сообщает телефону номер голосовой VLAN по CDP."},

  /* ── Безопасность (дни 49–51) ── */
  {id:"k32",b:6,day:49,t:"Настройте port security на Gi0/2: не более 2 MAC-адресов, режим нарушения restrict, запоминание адресов sticky.",
   steps:[["SW1(config)#",R(INT,GI("0/2")),"interface g0/2"],
          ["SW1(config-if)#",R(SW,"mode",ab("access",3)),"switchport mode access"],
          ["SW1(config-if)#",R(SW,"port-security"),"switchport port-security"],
          ["SW1(config-if)#",R(SW,"port-security",ab("maximum",3),"2"),"switchport port-security maximum 2"],
          ["SW1(config-if)#",R(SW,"port-security",ab("violation",3),ab("restrict",4)),"switchport port-security violation restrict"],
          ["SW1(config-if)#",R(SW,"port-security",ab("mac-address",3),"sticky"),"switchport port-security mac-address sticky"]],
   why:"Port security не включится на порту в режиме dynamic — сначала <code>mode access</code>. Без самой команды <code>switchport port-security</code> остальные параметры не действуют."},

  {id:"k33",b:6,day:50,t:"Включите DHCP snooping для VLAN 10 и сделайте доверенным аплинк Gi0/1.",
   steps:[["SW1(config)#",R(IP,"dhcp","snooping"),"ip dhcp snooping"],
          ["SW1(config)#",R(IP,"dhcp","snooping","vlan","10"),"ip dhcp snooping vlan 10"],
          ["SW1(config)#",R(INT,GI("0/1")),"interface g0/1"],
          ["SW1(config-if)#",R(IP,"dhcp","snooping","trust"),"ip dhcp snooping trust"]],
   why:"Без указания VLAN глобальная команда ничего не защищает. Если сервер за другим коммутатором, иногда нужно <code>no ip dhcp snooping information option</code>."}
  ];
})();
