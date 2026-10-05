
## как настроить
customSkillDirs — поле конфига плагина @deepseek-ai/dsh-skill-filesystem, задаётся в YAML-патче профиля, а не в UI и не через переменную окружения. На этой машине это C:\Users\Kart\.dsh\profiles\desktop\cordis.patch.yml (слои: бандлы → патч профиля → C:\Users\Kart\.dsh\cordis.patch.yml → --patch)


- insert:
    - id: skill-github
      name: '@deepseek-ai/dsh-skill-filesystem'
      config:
        providerName: github
        includeDefaultRoots: false
        customSkillDirs:
          - C:\Users\Kart\skills\my-skills\skills